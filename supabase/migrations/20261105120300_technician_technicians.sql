-- #10 technician 模組：師傅資料、公開檢視表
--
-- 欄位分三類（欄位權限）：
-- - 師傅可以改：稱呼、專長類別、技能、服務地區、語言。
-- - 系統計算：評分、評價數、服務次數、平均回應分鐘。只有伺服器端能改（#59）。
-- - 管理員改：審核狀態、徽章（實名、證照、良民證）、證照摘要、性別（實名認證時確認）。只有伺服器端能改（#47、#48）。
--
-- 資安：
-- - 師傅只能讀、改自己的資料，而且只能改「師傅可以改」的欄位（評分、審核狀態改不了）。
-- - 未登入讀不到這張表；公開資料一律從 public_technicians 檢視表讀（只有已通過審核的師傅、可以公開的欄位）。
-- - 審核員、老闆可以讀；這次不給管理員修改（#47 走伺服器端並留紀錄）。
-- - 新增師傅資料（申請）由伺服器端處理（#48）。
-- - 不存全名、手機、證件號碼；實名資料和證件在 #48、#46 另外加密存放。

create table public.technicians (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 師傅可以改：display_name、categories、skills、service_areas、languages
  display_name text not null check (char_length(display_name) between 1 and 20),
  -- 性別：實名認證時確認，師傅不能自己改（客戶會依性別篩選）
  gender text not null check (gender in ('female', 'male')),
  categories text[] not null default '{}' check (cardinality(categories) <= 12),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  -- 服務地區：行政區代號，例如 tw-taipei-xinyi
  service_areas text[] not null default '{}' check (cardinality(service_areas) <= 50),
  languages text[] not null default '{}'
    check (languages <@ array['mandarin', 'taiwanese', 'hakka', 'english']),
  -- 管理員改（審核時）
  license_name text check (char_length(license_name) <= 40),
  license_years smallint check (license_years between 0 and 80),
  other_license_count smallint not null default 0 check (other_license_count between 0 and 50),
  identity_verified_at timestamptz,
  license_verified_at timestamptz,
  police_record_verified_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended', 'rejected')),
  approved_at timestamptz,
  -- 系統計算
  rating numeric(2, 1) check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  service_count integer not null default 0 check (service_count >= 0),
  response_minutes integer check (response_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.technicians is '師傅資料。公開資料從 public_technicians 讀。評分、審核狀態只有伺服器端能改。';

-- 陣列內容檢查（check 不能查別的表，所以用觸發程序）
create function public.technicians_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.categories) as c(code)
    where not exists (select 1 from public.service_categories s where s.code = c.code)
  ) then
    raise exception using errcode = 'check_violation', message = 'technicians: unknown category';
  end if;
  if exists (
    select 1 from unnest(new.skills) as s(v) where s.v is null or char_length(s.v) not between 1 and 20
  ) then
    raise exception using errcode = 'check_violation', message = 'technicians: skill must be 1-20 chars';
  end if;
  if exists (
    select 1 from unnest(new.service_areas) as a(v) where a.v is null or a.v !~ '^[a-z]{2}-[a-z0-9-]{1,60}$'
  ) then
    raise exception using errcode = 'check_violation', message = 'technicians: service area format invalid';
  end if;
  return new;
end;
$$;

revoke all on function public.technicians_validate() from public, anon, authenticated;

create trigger technicians_validate
  before insert or update on public.technicians
  for each row execute function public.technicians_validate();

create trigger technicians_set_updated_at
  before update on public.technicians
  for each row execute function public.set_updated_at();

alter table public.technicians enable row level security;
revoke all on table public.technicians from anon, authenticated;
grant select on table public.technicians to authenticated;
-- 師傅只能改這幾個欄位（評分、審核狀態、徽章改不了）
grant update (display_name, categories, skills, service_areas, languages)
  on table public.technicians to authenticated;

create policy technicians_select_own on public.technicians
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy technicians_update_own on public.technicians
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy technicians_select_admin on public.technicians
  for select to authenticated
  using ((select public.has_any_role(array['owner', 'reviewer'])));

-- ── 公開檢視表 ───────────────────────────────────────────────
-- 師傅列表、師傅個人頁用。只有已通過審核的師傅、只有可以公開的欄位。
--
-- 刻意用建立者的權限讀資料（沒有 security_invoker）：未登入的人沒有 technicians 的權限，
-- 只能透過這個檢視表看到下面列出的欄位。Supabase 後台的安全檢查會對這種檢視表顯示提醒，
-- 這是「只開放部分欄位」唯一的做法；新增欄位前要確認可以公開，tests/db/schema.rls.test.ts 會檢查欄位清單。
-- security_barrier：先套用「已通過審核」的過濾，再套用查詢條件，避免用故意出錯的查詢推測出未通過審核的師傅資料。
create view public.public_technicians with (security_barrier = true) as
  select
    t.user_id as id,
    t.display_name,
    t.gender,
    t.categories,
    t.skills,
    t.service_areas,
    t.languages,
    t.license_name,
    t.license_years,
    t.other_license_count,
    t.identity_verified_at,
    t.license_verified_at,
    t.police_record_verified_at,
    t.rating,
    t.review_count,
    t.service_count,
    t.response_minutes
  from public.technicians t
  where t.status = 'approved';

comment on view public.public_technicians is '公開的師傅資料：只有已通過審核的師傅、可以公開的欄位。';

revoke all on table public.public_technicians from anon, authenticated;
grant select on table public.public_technicians to anon, authenticated;
