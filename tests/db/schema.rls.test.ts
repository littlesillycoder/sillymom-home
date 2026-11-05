import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SERVICE_CATEGORIES } from "@/modules/booking";
import { createSignedInUser, type TestUser } from "./clients";
import { hasTestDb, skipReason, testDb } from "./supabase-test-env";

/**
 * #10 資料表的存取權限（Row Level Security、欄位權限）。
 * 角色：客戶 A、B；師傅 T1（已通過，有 A 的預約）、T2（審核中，沒有預約）；老闆、審核員、客服。
 */
const title = "資料庫結構：會員、師傅、案件與存取權限";
const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** public_technicians 只能有這些欄位（新增欄位前要確認可以公開） */
const PUBLIC_TECH_COLUMNS = [
  "categories",
  "display_name",
  "gender",
  "id",
  "identity_verified_at",
  "languages",
  "license_name",
  "license_verified_at",
  "license_years",
  "other_license_count",
  "police_record_verified_at",
  "rating",
  "response_minutes",
  "review_count",
  "service_areas",
  "service_count",
  "skills",
];

describe.skipIf(!hasTestDb)(hasTestDb ? title : `${title}（${skipReason}）`, () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let A: TestUser, B: TestUser, T1: TestUser, T2: TestUser;
  let owner: TestUser, reviewer: TestUser, support: TestUser;
  let requestA: string, requestB: string, bookingA: string, attachmentA: string;
  const users: TestUser[] = [];

  const denied = (error: { code?: string } | null) => {
    expect(error, "應該被拒絕").not.toBeNull();
  };

  beforeAll(async () => {
    admin = createClient(testDb.url!, testDb.secretKey!, options);
    anon = createClient(testDb.url!, testDb.publishableKey!, options);
    [A, B, T1, T2, owner, reviewer, support] = await Promise.all(
      ["cust-a", "cust-b", "tech-1", "tech-2", "owner", "reviewer", "support"].map((l) =>
        createSignedInUser(admin, l),
      ),
    );
    users.push(A, B, T1, T2, owner, reviewer, support);

    const roles = await admin.from("user_roles").insert([
      { user_id: T1.id, role: "technician" },
      { user_id: T2.id, role: "technician" },
      { user_id: owner.id, role: "owner" },
      { user_id: reviewer.id, role: "reviewer" },
      { user_id: support.id, role: "support" },
    ]);
    expect(roles.error).toBeNull();

    // 分開新增：一次新增多筆時，沒填的欄位會變成 null 而不是預設值
    const t1 = await admin.from("technicians").insert({
      user_id: T1.id,
      display_name: "林師傅",
      gender: "female",
      categories: ["aircon"],
      skills: ["冷氣漏水"],
      service_areas: ["tw-taipei-xinyi"],
      languages: ["mandarin", "taiwanese"],
      identity_verified_at: new Date().toISOString(),
      status: "approved",
      approved_at: new Date().toISOString(),
      rating: 4.8,
      review_count: 12,
    });
    expect(t1.error).toBeNull();
    const t2 = await admin
      .from("technicians")
      .insert({ user_id: T2.id, display_name: "陳師傅", gender: "male", status: "pending" });
    expect(t2.error).toBeNull();

    const ra = await A.client
      .from("help_requests")
      .insert({ category_code: "aircon", description: "室內機滴水", district: "tw-taipei-xinyi" })
      .select("id")
      .single();
    expect(ra.error).toBeNull();
    requestA = ra.data!.id;

    const rb = await B.client
      .from("help_requests")
      .insert({ category_code: "plumbing", description: "水龍頭漏水", district: "tw-taipei-daan" })
      .select("id")
      .single();
    expect(rb.error).toBeNull();
    requestB = rb.data!.id;

    const bk = await admin
      .from("video_bookings")
      .insert({ request_id: requestA, customer_id: A.id, technician_id: T1.id, sequence: 1 })
      .select("id")
      .single();
    expect(bk.error).toBeNull();
    bookingA = bk.data!.id;

    const at = await A.client
      .from("request_attachments")
      .insert({
        request_id: requestA,
        kind: "photo",
        content_type: "image/jpeg",
        size_bytes: 1000,
        storage_path: `requests/${requestA}/photo-1.jpg`,
      })
      .select("id")
      .single();
    expect(at.error).toBeNull();
    attachmentA = at.data!.id;
  });

  afterAll(async () => {
    const ids = [requestA, requestB].filter(Boolean);
    await admin?.from("video_bookings").delete().in("request_id", ids);
    await admin?.from("help_requests").delete().in("id", ids);
    for (const u of users) await admin.auth.admin.deleteUser(u.id);
  });

  describe("角色與新帳號", () => {
    it("新帳號自動有客戶資料（語言預設繁中）和客戶角色", async () => {
      const c = await A.client.from("customers").select("user_id, locale").eq("user_id", A.id);
      expect(c.data).toEqual([{ user_id: A.id, locale: "zh-TW" }]);
      const r = await A.client.from("user_roles").select("role");
      expect(r.data).toEqual([{ role: "customer" }]);
    });

    it("一般使用者不能自己加角色、改角色、刪角色", async () => {
      denied((await A.client.from("user_roles").insert({ user_id: A.id, role: "owner" })).error);
      denied(
        (await A.client.from("user_roles").update({ role: "owner" }).eq("user_id", A.id)).error,
      );
      denied((await A.client.from("user_roles").delete().eq("user_id", A.id)).error);
    });

    it("只讀得到自己的角色；老闆讀得到全部", async () => {
      const a = await A.client.from("user_roles").select("user_id").eq("user_id", T1.id);
      expect(a.data).toEqual([]);
      const o = await owner.client.from("user_roles").select("user_id").eq("user_id", T1.id);
      expect(o.data?.length).toBe(2);
    });

    it("未登入不能呼叫角色檢查函式", async () => {
      denied((await anon.rpc("has_role", { p_role: "owner" })).error);
    });
  });

  describe("客戶資料", () => {
    it("A 客戶讀不到 B 客戶的資料", async () => {
      const r = await A.client.from("customers").select("user_id").eq("user_id", B.id);
      expect(r.data).toEqual([]);
    });

    it("可以改自己的稱呼和語言", async () => {
      const r = await A.client
        .from("customers")
        .update({ display_name: "林小姐", locale: "en" })
        .eq("user_id", A.id)
        .select("display_name, locale");
      expect(r.data).toEqual([{ display_name: "林小姐", locale: "en" }]);
    });

    it("改不了別人的資料（0 筆）", async () => {
      const r = await A.client
        .from("customers")
        .update({ display_name: "x" })
        .eq("user_id", B.id)
        .select("user_id");
      expect(r.data).toEqual([]);
    });

    it("不能自己新增、刪除客戶資料，也不能改使用者編號", async () => {
      denied((await A.client.from("customers").insert({ user_id: A.id })).error);
      denied((await A.client.from("customers").delete().eq("user_id", A.id)).error);
      denied(
        (await A.client.from("customers").update({ user_id: B.id }).eq("user_id", A.id)).error,
      );
    });

    it("師傅讀得到有預約自己的客戶；沒有預約的師傅讀不到", async () => {
      const t1 = await T1.client.from("customers").select("user_id").eq("user_id", A.id);
      expect(t1.data).toEqual([{ user_id: A.id }]);
      const t2 = await T2.client.from("customers").select("user_id").eq("user_id", A.id);
      expect(t2.data).toEqual([]);
    });

    it("未登入讀不到", async () => {
      denied((await anon.from("customers").select("user_id")).error);
    });
  });

  describe("師傅資料", () => {
    it("未登入讀不到師傅資料表", async () => {
      denied((await anon.from("technicians").select("user_id")).error);
    });

    it("客戶、其他師傅讀不到師傅資料表（只能從公開檢視表讀）", async () => {
      expect((await A.client.from("technicians").select("user_id")).data).toEqual([]);
      const t2 = await T2.client.from("technicians").select("user_id").eq("user_id", T1.id);
      expect(t2.data).toEqual([]);
    });

    it("師傅可以改自己的稱呼、專長、技能、服務地區、語言", async () => {
      const r = await T1.client
        .from("technicians")
        .update({
          display_name: "林師傅",
          skills: ["冷氣漏水", "定期保養"],
          languages: ["mandarin"],
        })
        .eq("user_id", T1.id)
        .select("skills");
      expect(r.error).toBeNull();
      expect(r.data).toEqual([{ skills: ["冷氣漏水", "定期保養"] }]);
    });

    it.each([
      ["評分", { rating: 5 }],
      ["評價數", { review_count: 999 }],
      ["服務次數", { service_count: 999 }],
      ["審核狀態", { status: "approved" }],
      ["實名徽章", { identity_verified_at: new Date().toISOString() }],
      ["證照", { license_name: "假證照" }],
      ["性別", { gender: "male" }],
    ])("師傅改不了自己的%s", async (_, patch) => {
      denied((await T2.client.from("technicians").update(patch).eq("user_id", T2.id)).error);
    });

    it("師傅改不了別的師傅（0 筆）", async () => {
      const r = await T2.client
        .from("technicians")
        .update({ display_name: "x" })
        .eq("user_id", T1.id)
        .select("user_id");
      expect(r.data).toEqual([]);
    });

    it("不存在的類別、格式不對的服務地區會被擋下", async () => {
      denied(
        (
          await T1.client
            .from("technicians")
            .update({ categories: ["nope"] })
            .eq("user_id", T1.id)
        ).error,
      );
      denied(
        (
          await T1.client
            .from("technicians")
            .update({ service_areas: ["台北市"] })
            .eq("user_id", T1.id)
        ).error,
      );
    });
  });

  describe("公開的師傅檢視表", () => {
    it("未登入讀得到已通過審核的師傅，讀不到審核中的", async () => {
      const r = await anon.from("public_technicians").select("id");
      const ids = (r.data ?? []).map((t) => t.id);
      expect(ids).toContain(T1.id);
      expect(ids).not.toContain(T2.id);
    });

    it("只有可以公開的欄位（沒有審核狀態、建立時間等）", async () => {
      const r = await anon.from("public_technicians").select("*").eq("id", T1.id).single();
      expect(Object.keys(r.data!).sort()).toEqual(PUBLIC_TECH_COLUMNS);
    });

    it("不能透過檢視表修改", async () => {
      denied((await anon.from("public_technicians").update({ rating: 5 }).eq("id", T1.id)).error);
      denied(
        (await A.client.from("public_technicians").update({ rating: 5 }).eq("id", T1.id)).error,
      );
    });
  });

  describe("服務類別", () => {
    it("未登入讀得到，代號和程式裡的清單一樣（順序也一樣）", async () => {
      const r = await anon.from("service_categories").select("code").order("sort_order");
      expect(r.data?.map((c) => c.code)).toEqual([...SERVICE_CATEGORIES]);
    });

    it("不能從網站修改", async () => {
      denied(
        (await A.client.from("service_categories").insert({ code: "x", sort_order: 99 })).error,
      );
    });
  });

  describe("求助", () => {
    it("A 客戶讀不到 B 客戶的求助", async () => {
      expect((await A.client.from("help_requests").select("id").eq("id", requestB)).data).toEqual(
        [],
      );
    });

    it("不能替別人建立求助", async () => {
      denied(
        (
          await A.client.from("help_requests").insert({
            customer_id: B.id,
            category_code: "aircon",
            description: "x",
            district: "tw-taipei-xinyi",
          })
        ).error,
      );
    });

    it("可以改自己 open 的求助描述，但改不了狀態", async () => {
      const r = await A.client
        .from("help_requests")
        .update({ description: "室內機滴水，有異音" })
        .eq("id", requestA)
        .select("description");
      expect(r.data).toEqual([{ description: "室內機滴水，有異音" }]);
      denied(
        (await A.client.from("help_requests").update({ status: "closed" }).eq("id", requestA))
          .error,
      );
    });

    it("師傅只讀得到有預約自己的求助", async () => {
      expect((await T1.client.from("help_requests").select("id")).data).toEqual([{ id: requestA }]);
      expect((await T2.client.from("help_requests").select("id")).data).toEqual([]);
    });

    it("未登入讀不到", async () => {
      denied((await anon.from("help_requests").select("id")).error);
    });

    it("不存在的類別、格式不對的行政區會被擋下", async () => {
      denied(
        (
          await A.client
            .from("help_requests")
            .insert({ category_code: "nope", description: "x", district: "tw-taipei-xinyi" })
        ).error,
      );
      denied(
        (
          await A.client
            .from("help_requests")
            .insert({ category_code: "aircon", description: "x", district: "台北市信義區松仁路" })
        ).error,
      );
    });
    it("停用的服務類別不能用在新的求助", async () => {
      const off = await admin
        .from("service_categories")
        .update({ active: false })
        .eq("code", "pest");
      expect(off.error).toBeNull();
      try {
        denied(
          (
            await A.client
              .from("help_requests")
              .insert({ category_code: "pest", description: "x", district: "tw-taipei-xinyi" })
          ).error,
        );
      } finally {
        await admin.from("service_categories").update({ active: true }).eq("code", "pest");
      }
    });
  });

  describe("附件", () => {
    it("存放位置一定在自己求助的資料夾底下", async () => {
      for (const storage_path of [
        `requests/${requestB}/photo.jpg`,
        `requests/${requestA}/../${requestB}/photo.jpg`,
        `other/${requestA}/photo.jpg`,
      ]) {
        denied(
          (
            await A.client.from("request_attachments").insert({
              request_id: requestA,
              kind: "photo",
              content_type: "image/jpeg",
              size_bytes: 10,
              storage_path,
            })
          ).error,
        );
      }
    });

    it("不能把附件加到別人的求助", async () => {
      denied(
        (
          await A.client.from("request_attachments").insert({
            request_id: requestB,
            kind: "photo",
            content_type: "image/jpeg",
            size_bytes: 10,
            storage_path: `requests/${requestB}/x.jpg`,
          })
        ).error,
      );
    });

    it("B 客戶、沒有預約的師傅讀不到；有預約的師傅讀得到", async () => {
      expect((await B.client.from("request_attachments").select("id")).data).toEqual([]);
      expect((await T2.client.from("request_attachments").select("id")).data).toEqual([]);
      expect((await T1.client.from("request_attachments").select("id")).data).toEqual([
        { id: attachmentA },
      ]);
    });

    it("B 客戶刪不了 A 的附件（0 筆）", async () => {
      const r = await B.client
        .from("request_attachments")
        .delete()
        .eq("id", attachmentA)
        .select("id");
      expect(r.data ?? []).toEqual([]);
      const still = await admin.from("request_attachments").select("id").eq("id", attachmentA);
      expect(still.data).toHaveLength(1);
    });
  });

  describe("視訊預約", () => {
    it("客戶、師傅只讀得到自己的", async () => {
      expect((await A.client.from("video_bookings").select("id")).data).toEqual([{ id: bookingA }]);
      expect((await T1.client.from("video_bookings").select("id")).data).toEqual([
        { id: bookingA },
      ]);
      expect((await B.client.from("video_bookings").select("id")).data).toEqual([]);
      expect((await T2.client.from("video_bookings").select("id")).data).toEqual([]);
    });

    it("客戶、師傅都不能建立或修改預約（一律走伺服器端）", async () => {
      denied(
        (
          await A.client.from("video_bookings").insert({
            request_id: requestA,
            customer_id: A.id,
            technician_id: T1.id,
            sequence: 2,
          })
        ).error,
      );
      denied(
        (await T1.client.from("video_bookings").update({ status: "completed" }).eq("id", bookingA))
          .error,
      );
    });

    it("預約的客戶一定要是求助的客戶", async () => {
      denied(
        (
          await admin.from("video_bookings").insert({
            request_id: requestA,
            customer_id: B.id,
            technician_id: T1.id,
            sequence: 2,
          })
        ).error,
      );
    });
  });

  describe("管理員（這次只能讀）", () => {
    it("老闆讀得到客戶、師傅、求助、預約", async () => {
      expect(
        (await owner.client.from("customers").select("user_id").eq("user_id", A.id)).data,
      ).toHaveLength(1);
      expect(
        (await owner.client.from("technicians").select("user_id").eq("user_id", T2.id)).data,
      ).toHaveLength(1);
      expect(
        (await owner.client.from("help_requests").select("id").eq("id", requestB)).data,
      ).toHaveLength(1);
      expect(
        (await owner.client.from("video_bookings").select("id").eq("id", bookingA)).data,
      ).toHaveLength(1);
    });

    it("審核員只讀得到師傅資料，讀不到客戶和求助", async () => {
      expect(
        (await reviewer.client.from("technicians").select("user_id").eq("user_id", T2.id)).data,
      ).toHaveLength(1);
      expect(
        (await reviewer.client.from("customers").select("user_id").eq("user_id", A.id)).data,
      ).toEqual([]);
      expect((await reviewer.client.from("help_requests").select("id")).data).toEqual([]);
    });

    it("客服讀得到客戶、求助、預約，讀不到師傅資料表", async () => {
      expect(
        (await support.client.from("customers").select("user_id").eq("user_id", A.id)).data,
      ).toHaveLength(1);
      expect(
        (await support.client.from("help_requests").select("id").eq("id", requestB)).data,
      ).toHaveLength(1);
      expect(
        (await support.client.from("video_bookings").select("id").eq("id", bookingA)).data,
      ).toHaveLength(1);
      expect(
        (await support.client.from("technicians").select("user_id").eq("user_id", T2.id)).data,
      ).toEqual([]);
    });

    it("老闆也不能直接改別人的資料（要走伺服器端並留紀錄，#47）", async () => {
      const c = await owner.client
        .from("customers")
        .update({ display_name: "x" })
        .eq("user_id", A.id)
        .select("user_id");
      expect(c.data ?? []).toEqual([]);
      denied(
        (await owner.client.from("technicians").update({ status: "approved" }).eq("user_id", T2.id))
          .error,
      );
    });
  });

  describe("平台設定", () => {
    it("一般使用者和管理員都不能從網站讀", async () => {
      denied((await A.client.from("platform_settings").select("key")).error);
      denied((await owner.client.from("platform_settings").select("key")).error);
    });

    it("初始值照設計稿（伺服器端讀）", async () => {
      const r = await admin.from("platform_settings").select("key, int_value, amount, currency");
      const byKey = Object.fromEntries((r.data ?? []).map((s) => [s.key, s]));
      expect(byKey.customer_request_fee).toMatchObject({ amount: 100, currency: "TWD" });
      expect(byKey.customer_late_reschedule_fee).toMatchObject({ amount: 50, currency: "TWD" });
      expect(byKey.tech_listing_review_fee).toMatchObject({ amount: 300, currency: "TWD" });
      expect(byKey.tech_video_service_fee).toMatchObject({ amount: 150, currency: "TWD" });
      expect(byKey.request_video_count).toMatchObject({ int_value: 2 });
      expect(byKey.request_valid_hours).toMatchObject({ int_value: 24 });
      expect(byKey.video_billable_minutes).toMatchObject({ int_value: 3 });
      expect(byKey.recording_retention_days).toMatchObject({ int_value: 180 });
      expect(byKey.provider_logs_retention_days).toMatchObject({ int_value: 90 });
    });
  });

  describe("刪除帳號", () => {
    it("有求助的帳號不能直接刪除；沒有求助的帳號刪除後，客戶資料和角色一起刪除", async () => {
      const C = await createSignedInUser(admin, "cust-c");
      const r = await C.client
        .from("help_requests")
        .insert({ category_code: "lock", description: "門鎖卡住", district: "tw-taipei-xinyi" })
        .select("id")
        .single();
      expect(r.error).toBeNull();

      const blocked = await admin.auth.admin.deleteUser(C.id);
      expect(blocked.error).not.toBeNull();

      await admin.from("help_requests").delete().eq("id", r.data!.id);
      const ok = await admin.auth.admin.deleteUser(C.id);
      expect(ok.error).toBeNull();
      expect((await admin.from("customers").select("user_id").eq("user_id", C.id)).data).toEqual(
        [],
      );
      expect((await admin.from("user_roles").select("role").eq("user_id", C.id)).data).toEqual([]);
    });
  });
});
