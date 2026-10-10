create table if not exists public.push_notification_log (
  user_id uuid not null,
  endpoint text not null,
  reminder_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, endpoint, reminder_key)
);
alter table public.push_notification_log enable row level security;
create index if not exists push_notification_log_sent_at_idx on public.push_notification_log(sent_at);
