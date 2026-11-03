-- 事件機制（docs/架構說明.md 第 4 節）
--
-- events：發生了什麼事。只放編號，不放個資（有 check 擋）。
-- event_deliveries：每個接收者一筆處理紀錄（狀態、嘗試次數、下次重試時間、錯誤訊息）。
--
-- 資安：
-- - 兩張表開啟 RLS、不建 policy、收回 anon／authenticated 的權限：只有伺服器端（secret key）能讀寫。
-- - 函式只開放給 service_role 執行，避免任何人透過網站 API 發出或認領事件。
-- - 函式一律 set search_path = ''，避免被同名物件劫持。

-- ── 個資欄位名稱檢查 ─────────────────────────────────────────
-- 和 src/shared/events/pii.ts 的規則相同，兩邊有各自的測試。
-- 欄位名稱拆成單字（底線或駝峰），任何一個單字在禁止清單就擋下。
create function public.event_key_is_forbidden(k text)
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
      'idno', 'national', 'passport', 'lat', 'lng', 'latitude', 'longitude'
    )
  )
  or lower(k) like '%id_number%'
  or lower(k) like '%idnumber%';
$$;

create function public.event_payload_has_forbidden_key(doc jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with recursive walk(v) as (
    select doc
    union all
    select child.value
    from walk
    cross join lateral (
      select o.value
      from jsonb_each(case when jsonb_typeof(walk.v) = 'object' then walk.v else '{}'::jsonb end) as o
      union all
      select a.value
      from jsonb_array_elements(case when jsonb_typeof(walk.v) = 'array' then walk.v else '[]'::jsonb end) as a
    ) as child
  )
  select exists (
    select 1
    from walk
    cross join lateral jsonb_object_keys(
      case when jsonb_typeof(walk.v) = 'object' then walk.v else '{}'::jsonb end
    ) as key
    where public.event_key_is_forbidden(key)
  );
$$;

-- ── 資料表 ──────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- 格式 <模組>.<過去式>，例如 video.ended；前半段必須是發出的模組。
  type text not null check (type ~ '^[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*$'),
  source_module text not null check (source_module ~ '^[a-z][a-z0-9-]*$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- 已經依接收者建立處理紀錄的時間；null 代表還沒分派。
  fanned_out_at timestamptz,
  constraint events_type_matches_source check (split_part(type, '.', 1) = source_module),
  constraint events_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint events_payload_size check (octet_length(payload::text) <= 8192),
  constraint events_payload_no_pii check (not public.event_payload_has_forbidden_key(payload))
);

comment on table public.events is '事件：只放編號，不放個資。只有伺服器端能讀寫。';

create index events_not_fanned_out_idx on public.events (created_at) where fanned_out_at is null;

create table public.event_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- 接收者名稱，格式 <模組>.<處理函式>
  handler text not null check (handler ~ '^[a-z][a-z0-9-]*\.[a-zA-Z][a-zA-Z0-9_]*$'),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  -- 錯誤訊息截短後才存，不存事件內容。
  last_error text check (char_length(last_error) <= 500),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  -- 同一事件、同一接收者只會有一筆，避免重複處理。
  constraint event_deliveries_once unique (event_id, handler)
);

comment on table public.event_deliveries is '事件處理紀錄：每個接收者一筆。只有伺服器端能讀寫。';

create index event_deliveries_due_idx on public.event_deliveries (next_attempt_at)
  where status in ('pending', 'processing');

alter table public.events enable row level security;
alter table public.event_deliveries enable row level security;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_deliveries from anon, authenticated;

-- ── 發出事件（同交易用）────────────────────────────────────
-- 在別的資料庫函式裡呼叫，和業務資料寫在同一個交易：一定同時成功或同時失敗。
-- 跟錢、權限、後台操作紀錄、申訴有關的事件一定要用這種方式。
create function public.emit_event(p_type text, p_source text, p_payload jsonb default '{}'::jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  insert into public.events (type, source_module, payload)
  values (p_type, p_source, coalesce(p_payload, '{}'::jsonb))
  returning id;
$$;

-- ── 分派：依接收者清單建立處理紀錄 ──────────────────────────
-- p_subscriptions 例如 {"video.ended": ["billing.onVideoEnded", "review.onVideoEnded"]}
create function public.fan_out_events(p_subscriptions jsonb, p_limit integer default 100)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  with batch as (
    select e.id, e.type
    from public.events e
    where e.fanned_out_at is null
    order by e.created_at
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  ),
  inserted as (
    insert into public.event_deliveries (event_id, handler)
    select b.id, h.handler
    from batch b
    cross join lateral jsonb_array_elements_text(
      coalesce(p_subscriptions -> b.type, '[]'::jsonb)
    ) as h(handler)
    on conflict (event_id, handler) do nothing
  )
  update public.events e
  set fanned_out_at = now()
  from batch b
  where e.id = b.id;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── 認領：取出到期的處理紀錄，鎖住避免兩個程式同時處理 ──────────
create function public.claim_event_deliveries(
  p_limit integer default 20,
  p_lock_seconds integer default 120,
  p_max_attempts integer default 6
)
returns table (
  delivery_id uuid,
  event_id uuid,
  handler text,
  attempts integer,
  event_type text,
  payload jsonb,
  event_created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- 處理到一半就中斷（例如伺服器重啟）、而且已經用完次數的，標記失敗。
  update public.event_deliveries d
  set status = 'failed', locked_until = null,
      last_error = coalesce(d.last_error, 'lock expired after max attempts')
  where d.status = 'processing'
    and d.locked_until < now()
    and d.attempts >= p_max_attempts;

  return query
  with due as (
    select d.id
    from public.event_deliveries d
    where (d.status = 'pending' and d.next_attempt_at <= now())
       or (d.status = 'processing' and d.locked_until < now())
    order by d.next_attempt_at
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update public.event_deliveries d
  set status = 'processing',
      attempts = d.attempts + 1,
      locked_until = now() + make_interval(secs => greatest(10, least(p_lock_seconds, 900)))
  from due, public.events e
  where d.id = due.id
    and e.id = d.event_id
  returning d.id, d.event_id, d.handler, d.attempts, e.type, e.payload, e.created_at;
end;
$$;

-- ── 函式權限：只開放給 service_role ──────────────────────────
revoke execute on function public.event_key_is_forbidden(text) from public, anon, authenticated;
revoke execute on function public.event_payload_has_forbidden_key(jsonb) from public, anon, authenticated;
revoke execute on function public.emit_event(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fan_out_events(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.claim_event_deliveries(integer, integer, integer) from public, anon, authenticated;

grant execute on function public.event_key_is_forbidden(text) to service_role;
grant execute on function public.event_payload_has_forbidden_key(jsonb) to service_role;
grant execute on function public.emit_event(text, text, jsonb) to service_role;
grant execute on function public.fan_out_events(jsonb, integer) to service_role;
grant execute on function public.claim_event_deliveries(integer, integer, integer) to service_role;
