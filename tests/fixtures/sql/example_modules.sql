-- 範例模組用的資料表（只在 GitHub Actions 的暫時測試資料庫建立）。
-- 資安：這個檔案不在 supabase/migrations/，也不在 seed 設定裡，`pnpm db:push` 不會推到雲端。

-- example-sender 的資料表
create table public.example_pings (
  id uuid primary key default gen_random_uuid(),
  note text not null,
  created_at timestamptz not null default now()
);

-- example-receiver 的資料表；event_id 唯一，重複收到同一事件也只會有一筆。
create table public.example_receipts (
  event_id uuid primary key,
  ping_id uuid not null,
  received_at timestamptz not null default now()
);

alter table public.example_pings enable row level security;
alter table public.example_receipts enable row level security;
revoke all on table public.example_pings from anon, authenticated;
revoke all on table public.example_receipts from anon, authenticated;

-- 同交易發出事件的範例：寫入 ping 和事件在同一個交易。
-- p_fail_after_emit = true 時，在發出事件之後故意失敗，證明兩者會一起取消。
create function public.example_send_ping_atomic(p_note text, p_fail_after_emit boolean default false)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.example_pings (note) values (p_note) returning id into v_id;
  perform public.emit_event('example-sender.pinged', 'example-sender', jsonb_build_object('pingId', v_id));
  if p_fail_after_emit then
    raise exception 'example failure after emit';
  end if;
  return v_id;
end;
$$;

revoke execute on function public.example_send_ping_atomic(text, boolean) from public, anon, authenticated;
grant execute on function public.example_send_ping_atomic(text, boolean) to service_role;

-- 讓網站 API 重新讀取資料表清單。
notify pgrst, 'reload schema';
