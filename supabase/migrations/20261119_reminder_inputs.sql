-- Small read for the push function: only users with push enabled, only their unfinished upcoming tasks + reminder rules.
-- Replaces reading every user's whole garden_state (with images, chats…) every 5 minutes, which used up the egress quota.
create or replace function public.reminder_inputs()
returns table(user_id uuid, timezone text, rules jsonb, tasks jsonb)
language sql stable security definer set search_path = public as $$
  select g.user_id,
         (select s.timezone from push_subscriptions s where s.user_id = g.user_id and s.enabled limit 1),
         g.state::jsonb -> 'reminderRules',
         coalesce((
           select jsonb_agg(jsonb_build_object('id', t->>'id', 'title', t->>'title', 'course', t->>'course', 'date', t->>'date', 'time', t->>'time'))
           from jsonb_array_elements(case when jsonb_typeof(g.state::jsonb -> 'tasks') = 'array' then g.state::jsonb -> 'tasks' else '[]'::jsonb end) t
           where coalesce((t->>'done')::boolean, false) = false
             and coalesce(t->>'eventType', 'due') <> 'duration'
             and coalesce(t->>'date', '') >= to_char(now() - interval '2 days', 'YYYY-MM-DD')
             and coalesce(t->>'date', '') <= to_char(now() + interval '3 days', 'YYYY-MM-DD')
         ), '[]'::jsonb)
  from garden_state g
  where exists (select 1 from push_subscriptions s where s.user_id = g.user_id and s.enabled);
$$;
revoke all on function public.reminder_inputs() from public, anon, authenticated;
grant execute on function public.reminder_inputs() to service_role;
