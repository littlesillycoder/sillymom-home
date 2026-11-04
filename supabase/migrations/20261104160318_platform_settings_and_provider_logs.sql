-- #4 外部服務替換介面：平台設定、外部服務紀錄
--
-- 資安：
-- - 兩張表開啟 RLS、不建 policy、收回 anon／authenticated 權限：只有伺服器端（secret key）能讀寫。
-- - 外部服務紀錄只有「老闆」能看：角色在 #47 建立，屆時加上 policy 和測試。
-- - 函式只開放給 service_role；一律 set search_path = ''。

-- ── 平台設定 ────────────────────────────────────────────────
-- 收費金額、保存天數等。#10 沿用這張表加上收費金額，不另建。
-- 每個設定只能有一種值：整數、金額（numeric(12,2)＋幣別，照 #5 規則）、文字。
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,62}$'),
  int_value integer,
  amount numeric(12, 2),
  currency text check (currency in ('TWD', 'EUR')),
  text_value text check (char_length(text_value) <= 1000),
  description text not null default '',
  updated_at timestamptz not null default now(),
  constraint platform_settings_one_value check (
    (int_value is not null)::int
    + (amount is not null)::int
    + (text_value is not null)::int = 1
  ),
  constraint platform_settings_amount_currency check ((amount is null) = (currency is null))
);

comment on table public.platform_settings is '平台設定（收費金額、保存天數）。只有伺服器端能讀寫；後台平台設定頁（#41）修改。';

alter table public.platform_settings enable row level security;
revoke all on table public.platform_settings from anon, authenticated;

insert into public.platform_settings (key, int_value, description) values
  ('provider_logs_retention_days', 90, '外部服務紀錄保存天數，過期自動刪除');

-- ── 外部服務紀錄 ───────────────────────────────────────────
-- 寫入前程式已遮罩個資（手機只留前 2 後 3 碼、驗證碼、載具）；通知只存範本代號和案件編號。
-- 交易編號、金額、結果、狀態碼、錯誤訊息完整保留（對帳、查問題用）。
create table public.provider_logs (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('payment', 'invoice', 'sms', 'notify')),
  implementation text not null check (implementation ~ '^[a-z][a-z0-9]{1,30}$'),
  action text not null check (action ~ '^[a-zA-Z]{1,40}$'),
  idempotency_key text check (idempotency_key ~ '^[A-Za-z0-9_-]{8,100}$'),
  status text not null check (status in ('success', 'failure')),
  external_id text check (char_length(external_id) <= 200),
  amount numeric(12, 2),
  currency text check (currency in ('TWD', 'EUR')),
  result_code text check (char_length(result_code) <= 100),
  error_message text check (char_length(error_message) <= 2000),
  request jsonb not null default '{}'::jsonb check (octet_length(request::text) <= 8192),
  response jsonb check (octet_length(response::text) <= 8192),
  created_at timestamptz not null default now(),
  constraint provider_logs_amount_currency check ((amount is null) = (currency is null))
);

comment on table public.provider_logs is '外部服務紀錄（金流、發票、簡訊、通知）。個資已遮罩。只有伺服器端能讀寫；老闆可看（#47）。';

-- 不重複執行：同一個服務、同一個動作、同一個編號只會有一筆
create unique index provider_logs_idempotency_idx
  on public.provider_logs (service, action, idempotency_key)
  where idempotency_key is not null;

create index provider_logs_external_id_idx on public.provider_logs (service, external_id)
  where external_id is not null;
create index provider_logs_created_at_idx on public.provider_logs (created_at);

alter table public.provider_logs enable row level security;
revoke all on table public.provider_logs from anon, authenticated;

-- ── 依平台設定刪除過期紀錄 ───────────────────────────────────
-- 由 POST /internal/maintenance 執行（排程在 #83 設定）。回傳刪除筆數。
create function public.purge_provider_logs()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  days integer;
  n integer;
begin
  select int_value into days from public.platform_settings where key = 'provider_logs_retention_days';
  if days is null or days < 1 then
    raise exception using errcode = 'check_violation',
      message = 'platform_settings.provider_logs_retention_days must be a positive integer';
  end if;
  delete from public.provider_logs where created_at < now() - make_interval(days => days);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.purge_provider_logs() from public, anon, authenticated;
grant execute on function public.purge_provider_logs() to service_role;
