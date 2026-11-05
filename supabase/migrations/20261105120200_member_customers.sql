-- #10 member 模組：客戶資料
--
-- 只放稱呼和語言。手機號碼只在 Supabase Auth（auth.users），不重複存。
-- 完整地址、緊急聯絡人在到府功能（#30、#32）再加。
--
-- 資安：
-- - 客戶只能讀、改自己的資料；能改的欄位只有稱呼和語言（欄位權限）。
-- - 不能自己新增或刪除：註冊時由資料庫自動建立，帳號刪除時跟著刪除。
-- - 師傅讀得到「有預約自己的」客戶稱呼：policy 在 booking 模組（video_bookings 建立之後）。
-- - 客服、老闆可以讀；這次不給管理員修改（#47 走伺服器端並留紀錄）。

create table public.customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 稱呼，例如「林小姐」。不是全名。
  display_name text not null default '' check (char_length(display_name) <= 20),
  -- 通知、畫面的語言（#4 的通知範本依這個選語言）
  locale text not null default 'zh-TW' check (locale in ('zh-TW', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customers is '客戶資料（稱呼、語言）。手機號碼只在 auth.users。';

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
revoke all on table public.customers from anon, authenticated;
grant select on table public.customers to authenticated;
grant update (display_name, locale) on table public.customers to authenticated;

create policy customers_select_own on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy customers_update_own on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy customers_select_admin on public.customers
  for select to authenticated
  using ((select public.has_any_role(array['owner', 'support'])));

-- ── 新帳號自動建立客戶資料和客戶角色 ───────────────────────────
-- Supabase Auth 新增使用者時執行（Supabase 官方做法）。
-- security definer：用建立者的權限寫入（使用者本身沒有寫入權限）。一般使用者呼叫不到。
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customers (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
    on conflict (user_id, role) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
