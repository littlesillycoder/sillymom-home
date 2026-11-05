-- #10 booking 模組：服務類別
--
-- 只存代號；中英文名稱放語言檔（src/shared/i18n/messages 的 serviceCategories）。
-- 師傅的專長類別、求助的類別都只能是這裡的代號。
-- 公開資料：未登入也能讀（求助頁、師傅列表的篩選）。不能從網站修改。

create table public.service_categories (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{1,30}$'),
  sort_order smallint not null unique,
  active boolean not null default true
);

comment on table public.service_categories is '服務類別代號。名稱放語言檔。公開可讀，只能用 migration 修改。';

alter table public.service_categories enable row level security;
revoke all on table public.service_categories from anon, authenticated;
grant select on table public.service_categories to anon, authenticated;

create policy service_categories_select_all on public.service_categories
  for select to anon, authenticated
  using (true);

-- 設計稿 Request：12 個類別（順序照設計稿）
insert into public.service_categories (code, sort_order) values
  ('plumbing', 1),        -- 水電與漏水
  ('aircon', 2),          -- 冷氣
  ('appliance', 3),       -- 家電
  ('lighting', 4),        -- 燈具與插座
  ('lock', 5),            -- 門鎖
  ('network', 6),         -- 3C 與網路
  ('smart_home', 7),      -- 智慧家電與監視器
  ('painting', 8),        -- 油漆與小裝修
  ('pest', 9),            -- 除蟲
  ('furniture', 10),      -- 家具組裝
  ('handyman', 11),       -- 居家小修繕
  ('unsure', 12);         -- 不確定是哪一類
