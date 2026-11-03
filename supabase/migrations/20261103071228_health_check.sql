-- 工程檢查用資料表：/health 用來確認網站能讀寫資料庫。
-- 只有伺服器端（secret key）能讀寫；一般使用者（未登入、已登入）沒有任何權限。

create table public.health_check (
  id smallint primary key check (id = 1),
  checked_at timestamptz not null default now()
);

comment on table public.health_check is '工程檢查用，/health 寫入最後檢查時間。只有伺服器端能讀寫。';

alter table public.health_check enable row level security;

-- 不建立任何 policy：開啟 RLS 後，沒有 policy 就代表 anon、authenticated 都讀寫不到。
-- 另外收回表格權限，多一層保險。
revoke all on table public.health_check from anon, authenticated;
