-- #11 member 模組：同意條款的紀錄
--
-- 註冊（第一次登入）時，使用者勾「我同意 服務條款 與 隱私政策」，在這裡各留一筆紀錄。
-- 條款版本放在平台設定 terms_version；正式條款上線時改版本號，大家下次登入要重新同意。
--
-- 資安：
-- - 只能新增自己的紀錄，而且版本一定是目前的版本（current_terms_version()），不能自己填別的版本。
-- - 只能讀自己的；不能修改、刪除（這是之後有糾紛時的證據）。客服、老闆可以讀。
-- - 不記 IP、裝置等額外個資。

create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document text not null check (document in ('terms', 'privacy')),
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[a-z0-9-]{1,30}$'),
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);

comment on table public.terms_acceptances is '同意條款的紀錄（服務條款、隱私政策）。只能新增自己、目前版本的紀錄；不能修改或刪除。';

create index terms_acceptances_user_idx on public.terms_acceptances (user_id);

-- 平台設定：條款版本、重新傳送驗證碼的秒數
-- sms_resend_seconds 要和 Supabase Auth 的簡訊間隔（supabase/config.toml 的 max_frequency、雲端後台）一致，
-- 畫面上的倒數用這個值。
insert into public.platform_settings (key, int_value, text_value, description) values
  ('terms_version', null, '2026-11-draft', '目前的服務條款、隱私政策版本；改了之後大家下次登入要重新同意'),
  ('sms_resend_seconds', 60, null, '重新傳送驗證碼前要等幾秒（要和 Supabase Auth 的簡訊間隔一致）');

-- 目前的條款版本。一般使用者讀不到 platform_settings，所以用建立者的權限讀這一個值。
create function public.current_terms_version()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select text_value from public.platform_settings where key = 'terms_version';
$$;

revoke all on function public.current_terms_version() from public, anon;
grant execute on function public.current_terms_version() to authenticated, service_role;

alter table public.terms_acceptances enable row level security;
revoke all on table public.terms_acceptances from anon, authenticated;
grant select on table public.terms_acceptances to authenticated;
grant insert (document, version) on table public.terms_acceptances to authenticated;

create policy terms_acceptances_select_own on public.terms_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy terms_acceptances_insert_own_current on public.terms_acceptances
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and version = (select public.current_terms_version())
  );

create policy terms_acceptances_select_admin on public.terms_acceptances
  for select to authenticated
  using ((select public.has_any_role(array['owner', 'support'])));
