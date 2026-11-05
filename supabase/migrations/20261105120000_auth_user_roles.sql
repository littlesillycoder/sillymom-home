-- #10 auth 模組：使用者角色
--
-- 角色：customer（客戶）、technician（師傅）、owner（老闆）、reviewer（審核員）、support（客服）。
-- 一個人可以有多個角色（例如客戶也申請成為師傅）。
--
-- 資安：
-- - 一般使用者只能讀自己的角色，不能新增、修改、刪除（沒有寫入權限，也沒有寫入的 policy）。
--   客戶角色在註冊時由資料庫自動給（member 模組的 handle_new_user）；
--   師傅角色在審核通過時由伺服器端給（#48）；管理員角色只能由伺服器端設定（#47）。
-- - 權限檢查用 has_role()：用建立者的權限讀角色表（security definer），所以 policy 裡用它不會遞迴，
--   也不會因為使用者讀不到別人的角色而判斷錯誤。拿掉角色立刻生效（不放在登入憑證裡）。
-- - 函式一律 set search_path = ''，避免被同名物件劫持。

-- ── 共用：更新時間 ───────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ── 角色 ─────────────────────────────────────────────────────
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('customer', 'technician', 'owner', 'reviewer', 'support')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is '使用者角色。一般使用者只能讀自己的；新增、修改只能由資料庫自動建立或伺服器端（#47、#48）。';

alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

-- 目前登入的使用者有沒有這個角色
create function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = p_role
  );
$$;

-- 目前登入的使用者有沒有其中一個角色
create function public.has_any_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = any (p_roles)
  );
$$;

revoke all on function public.has_role(text) from public, anon;
revoke all on function public.has_any_role(text[]) from public, anon;
grant execute on function public.has_role(text) to authenticated, service_role;
grant execute on function public.has_any_role(text[]) to authenticated, service_role;

create policy user_roles_select_own on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_roles_select_owner on public.user_roles
  for select to authenticated
  using ((select public.has_role('owner')));
