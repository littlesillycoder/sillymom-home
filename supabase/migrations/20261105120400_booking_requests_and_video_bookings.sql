-- #10 booking 模組：求助、附件、視訊預約
--
-- 資安：
-- - 求助只存行政區，不存完整地址（設計稿：師傅只看得到行政區）。完整地址在 #30、#32 再加。
-- - 客戶：讀、新增自己的求助和附件；求助還在 open 時可以修改類別、描述、行政區，可以刪除附件。
--   狀態只能由伺服器端改（欄位權限沒有 status）。
-- - 師傅：只讀得到「有預約自己的」求助、附件、預約，以及那位客戶的稱呼（customers 的 policy 在這裡建立）。
-- - 視訊預約：建立和狀態變更一律走伺服器端（扣款、計時），客戶和師傅都不能直接寫。
-- - 客服、老闆可以讀；這次不給管理員修改（#47）。
-- - 刪除帳號：有求助或預約的客戶、師傅不能直接刪除（on delete restrict），規則在 #33。

-- ── 求助 ─────────────────────────────────────────────────────
create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid()
    references public.customers (user_id) on delete restrict,
  category_code text not null references public.service_categories (code),
  description text not null check (char_length(description) between 1 and 2000),
  -- 行政區代號，例如 tw-taipei-xinyi
  district text not null check (district ~ '^[a-z]{2}-[a-z0-9-]{1,60}$'),
  status text not null default 'open'
    check (status in ('open', 'matched', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.help_requests is '求助（問題描述、類別、行政區、狀態）。不存完整地址。狀態只有伺服器端能改。';

create index help_requests_customer_idx on public.help_requests (customer_id);

create trigger help_requests_set_updated_at
  before update on public.help_requests
  for each row execute function public.set_updated_at();

-- ── 附件 ─────────────────────────────────────────────────────
-- 只有檔案紀錄；檔案本身放哪裡在 #15、#46 決定。
-- 存放位置一定在這個求助的資料夾底下（requests/<求助編號>/...），不能有 ..，避免指到別人的檔案。
create table public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  content_type text not null check (content_type ~ '^(image|video)/[a-z0-9.+-]{1,50}$'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 524288000),
  storage_path text not null unique check (
    storage_path ~ '^requests/[0-9a-f-]{36}/[A-Za-z0-9_-]{1,100}(\.[a-z0-9]{1,10})?$'
  ),
  created_at timestamptz not null default now(),
  constraint request_attachments_path_matches_request
    check (starts_with(storage_path, 'requests/' || request_id::text || '/'))
);

comment on table public.request_attachments is '求助的照片、影片紀錄。檔案存放位置限定在 requests/<求助編號>/ 底下。';

create index request_attachments_request_idx on public.request_attachments (request_id);

-- ── 視訊預約 ─────────────────────────────────────────────────
create table public.video_bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests (id) on delete restrict,
  customer_id uuid not null references public.customers (user_id) on delete restrict,
  technician_id uuid not null references public.technicians (user_id) on delete restrict,
  -- 這個求助的第幾次視訊。上限（目前 2 次）從平台設定 request_video_count 讀，由伺服器端檢查。
  sequence smallint not null check (sequence >= 1),
  -- 預約時間；null 代表「立即視訊」
  scheduled_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, sequence),
  constraint video_bookings_time_order check (ended_at is null or started_at is null or ended_at >= started_at)
);

comment on table public.video_bookings is '視訊預約。建立和狀態變更只有伺服器端能做。';

create index video_bookings_customer_idx on public.video_bookings (customer_id);
create index video_bookings_technician_idx on public.video_bookings (technician_id);
create index video_bookings_request_idx on public.video_bookings (request_id);

-- 預約的客戶一定是求助的客戶
create function public.video_bookings_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.help_requests r
    where r.id = new.request_id and r.customer_id = new.customer_id
  ) then
    raise exception using errcode = 'check_violation',
      message = 'video_bookings: customer must own the request';
  end if;
  return new;
end;
$$;

revoke all on function public.video_bookings_validate() from public, anon, authenticated;

create trigger video_bookings_validate
  before insert or update of request_id, customer_id on public.video_bookings
  for each row execute function public.video_bookings_validate();

create trigger video_bookings_set_updated_at
  before update on public.video_bookings
  for each row execute function public.set_updated_at();

-- ── 權限 ─────────────────────────────────────────────────────
alter table public.help_requests enable row level security;
alter table public.request_attachments enable row level security;
alter table public.video_bookings enable row level security;

revoke all on table public.help_requests from anon, authenticated;
revoke all on table public.request_attachments from anon, authenticated;
revoke all on table public.video_bookings from anon, authenticated;

grant select on table public.help_requests to authenticated;
grant insert (category_code, description, district) on table public.help_requests to authenticated;
grant update (category_code, description, district) on table public.help_requests to authenticated;

grant select, delete on table public.request_attachments to authenticated;
grant insert (request_id, kind, content_type, size_bytes, storage_path)
  on table public.request_attachments to authenticated;

grant select on table public.video_bookings to authenticated;

-- 視訊預約：客戶、師傅讀自己的；客服、老闆讀全部
create policy video_bookings_select_customer on public.video_bookings
  for select to authenticated
  using (customer_id = (select auth.uid()));

create policy video_bookings_select_technician on public.video_bookings
  for select to authenticated
  using (technician_id = (select auth.uid()));

create policy video_bookings_select_admin on public.video_bookings
  for select to authenticated
  using ((select public.has_any_role(array['owner', 'support'])));

-- 求助
create policy help_requests_select_customer on public.help_requests
  for select to authenticated
  using (customer_id = (select auth.uid()));

create policy help_requests_insert_customer on public.help_requests
  for insert to authenticated
  with check (customer_id = (select auth.uid()));

create policy help_requests_update_customer on public.help_requests
  for update to authenticated
  using (customer_id = (select auth.uid()) and status = 'open')
  with check (customer_id = (select auth.uid()));

create policy help_requests_select_technician on public.help_requests
  for select to authenticated
  using (exists (
    select 1 from public.video_bookings b
    where b.request_id = help_requests.id and b.technician_id = (select auth.uid())
  ));

create policy help_requests_select_admin on public.help_requests
  for select to authenticated
  using ((select public.has_any_role(array['owner', 'support'])));

-- 附件
create policy request_attachments_select_customer on public.request_attachments
  for select to authenticated
  using (exists (
    select 1 from public.help_requests r
    where r.id = request_attachments.request_id and r.customer_id = (select auth.uid())
  ));

create policy request_attachments_insert_customer on public.request_attachments
  for insert to authenticated
  with check (exists (
    select 1 from public.help_requests r
    where r.id = request_attachments.request_id
      and r.customer_id = (select auth.uid())
      and r.status = 'open'
  ));

create policy request_attachments_delete_customer on public.request_attachments
  for delete to authenticated
  using (exists (
    select 1 from public.help_requests r
    where r.id = request_attachments.request_id
      and r.customer_id = (select auth.uid())
      and r.status = 'open'
  ));

create policy request_attachments_select_technician on public.request_attachments
  for select to authenticated
  using (exists (
    select 1 from public.video_bookings b
    where b.request_id = request_attachments.request_id and b.technician_id = (select auth.uid())
  ));

create policy request_attachments_select_admin on public.request_attachments
  for select to authenticated
  using ((select public.has_any_role(array['owner', 'support'])));

-- 客戶資料：師傅讀得到「有預約自己的」客戶（只有稱呼和語言）
create policy customers_select_technician on public.customers
  for select to authenticated
  using (exists (
    select 1 from public.video_bookings b
    where b.customer_id = customers.user_id and b.technician_id = (select auth.uid())
  ));
