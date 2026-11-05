-- 資安檢查用的函式和資料表（#6，只在 GitHub Actions 的暫時測試資料庫建立）。
-- 資安：這個檔案不在 supabase/migrations/，`pnpm db:push` 不會推到雲端。

-- 列出 public 裡沒有開啟 Row Level Security 的資料表（應該是空的）。
create function public.test_tables_without_rls()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select c.relname::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity
  order by 1;
$$;

-- 新增資料表時自動開啟 RLS 的探針：刻意不寫 enable row level security。
-- 也沒有收回 anon／authenticated 的權限，用來證明「只靠自動開啟的 RLS」也讀不到。
create table public.zz_rls_auto_enable_probe (
  id int primary key,
  note text not null
);
insert into public.zz_rls_auto_enable_probe values (1, 'probe');

create function public.test_table_has_rls(p_table text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select c.relrowsecurity
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = p_table;
$$;

revoke execute on function public.test_tables_without_rls() from public, anon, authenticated;
revoke execute on function public.test_table_has_rls(text) from public, anon, authenticated;
grant execute on function public.test_tables_without_rls() to service_role;
grant execute on function public.test_table_has_rls(text) to service_role;

notify pgrst, 'reload schema';
