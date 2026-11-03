-- 事件檢查改用觸發程序，錯誤訊息不帶出資料（#3 驗證時發現）。
--
-- 問題：PostgreSQL 的 check constraint 失敗時，錯誤明細會附上整筆資料
-- （DETAIL: Failing row contains (...)），被擋下的個資會出現在錯誤訊息和資料庫 log。
-- 修正：events 表上所有的 check constraint 改成 BEFORE INSERT/UPDATE 觸發程序，
-- 自己丟出錯誤：只寫哪一條規則、哪些欄位名稱，不寫任何值。

alter table public.events
  drop constraint events_type_check,
  drop constraint events_source_module_check,
  drop constraint events_type_matches_source,
  drop constraint events_payload_is_object,
  drop constraint events_payload_size,
  drop constraint events_payload_no_pii;

drop function public.event_payload_has_forbidden_key(jsonb);

-- 回傳事件內容裡不允許的欄位名稱（只有名稱，不含值）。
create function public.event_payload_forbidden_keys(doc jsonb)
returns text[]
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
  select coalesce(array_agg(distinct key order by key), '{}')
  from walk
  cross join lateral jsonb_object_keys(
    case when jsonb_typeof(walk.v) = 'object' then walk.v else '{}'::jsonb end
  ) as key
  where public.event_key_is_forbidden(key);
$$;

create function public.events_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  bad text[];
begin
  -- 錯誤訊息一律不帶值（事件名稱、內容都可能來自有問題的呼叫端）。
  if new.type is null or new.type !~ '^[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*$' then
    raise exception using errcode = 'check_violation',
      message = 'events: type must be <module>.<past_tense>';
  end if;
  if new.source_module is null or new.source_module !~ '^[a-z][a-z0-9-]*$' then
    raise exception using errcode = 'check_violation',
      message = 'events: source_module format invalid';
  end if;
  if split_part(new.type, '.', 1) <> new.source_module then
    raise exception using errcode = 'check_violation',
      message = 'events: type must start with source_module';
  end if;
  if new.payload is null or jsonb_typeof(new.payload) <> 'object' then
    raise exception using errcode = 'check_violation',
      message = 'events: payload must be a JSON object';
  end if;
  if octet_length(new.payload::text) > 8192 then
    raise exception using errcode = 'check_violation',
      message = 'events: payload larger than 8192 bytes';
  end if;

  bad := public.event_payload_forbidden_keys(new.payload);
  if cardinality(bad) > 0 then
    raise exception using errcode = 'check_violation',
      message = left('events: payload contains forbidden keys (no personal data in events): '
        || array_to_string(bad, ', '), 300);
  end if;

  return new;
end;
$$;

create trigger events_validate
  before insert or update on public.events
  for each row execute function public.events_validate();

revoke execute on function public.event_payload_forbidden_keys(jsonb) from public, anon, authenticated;
revoke execute on function public.events_validate() from public, anon, authenticated;
grant execute on function public.event_payload_forbidden_keys(jsonb) to service_role;
