-- Lets the public work-log form fetch a machine's last known dashboard reading, so the
-- start reading a driver enters can be validated for continuity against it. Public/anon
-- cannot select from work_logs directly (RLS is admin-only), so this is exposed narrowly
-- via a SECURITY DEFINER RPC instead of opening up read access to the whole table.
create or replace function get_previous_end_reading(p_machine uuid, p_before_date date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select end_reading from work_logs
  where machine_id = p_machine and work_date < p_before_date
  order by work_date desc, created_at desc
  limit 1;
$$;

grant execute on function get_previous_end_reading(uuid, date) to anon, authenticated;
