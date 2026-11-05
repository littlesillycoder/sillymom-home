-- 資安基本設定（#6）
--
-- 1. 新資料表自動開啟 Row Level Security
--    在 public 新增資料表時，自動執行 alter table ... enable row level security。
--    用 migration 建立（不在後台手動按），每個環境都一樣。
--    沒有設定 policy 的資料表，結果是「誰都讀不到」，往安全的方向出錯。
--    每張表還是要在自己的 migration 明確寫 enable row level security 和 policy，這裡是防漏的第二道。
--
-- 2. 個資欄位名稱檢查加上 otp（驗證碼）和 LINE 使用者 ID
--    和 src/shared/events/pii.ts 的規則相同，兩邊有各自的測試。

-- ── 1. 新資料表自動開啟 RLS ─────────────────────────────────
-- security invoker（預設）：用建立資料表的角色執行，它就是資料表的擁有者，可以開啟 RLS。
create function public.rls_auto_enable()
returns event_trigger
language plpgsql
set search_path = ''
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_catalog.pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
      and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', cmd.object_identity);
  end loop;
end;
$$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create event trigger rls_auto_enable
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

-- ── 2. 個資欄位名稱檢查 ─────────────────────────────────────
create or replace function public.event_key_is_forbidden(k text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from unnest(
      string_to_array(
        lower(regexp_replace(k, '([a-z0-9])([A-Z])', '\1_\2', 'g')),
        '_'
      )
    ) as t(token)
    where t.token in (
      'phone', 'mobile', 'tel', 'address', 'addr', 'email', 'mail', 'name',
      'birthday', 'birthdate', 'password', 'passwd', 'secret', 'token', 'card',
      'idno', 'national', 'passport', 'lat', 'lng', 'latitude', 'longitude', 'otp'
    )
  )
  or lower(k) like '%id_number%'
  or lower(k) like '%idnumber%'
  -- LINE 使用者 ID：lineId、line_user_id、lineUserId（lineItems 不受影響）
  or lower(regexp_replace(k, '([a-z0-9])([A-Z])', '\1_\2', 'g')) ~ '(^|_)line_(user_)?id(_|$)';
$$;
