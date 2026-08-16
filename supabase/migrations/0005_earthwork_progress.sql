-- Per-machine earthwork capacity: cubic meters per trip (Tipper) or per hour (Excavator/Machine).
-- Editable by admins via the existing machines_write_admin RLS policy (no new policy needed).
alter table machines add column capacity numeric;

-- Public earthwork-progress dashboard: aggregates trips/hours per machine for a project + date
-- range, scoped to one machine_type at a time (टिप्पर for trip-basis, डोझर/एस्कॅव्हेटर for hour-basis).
-- Public/anon cannot select from work_logs directly (RLS is admin-only), so this is exposed
-- narrowly via a SECURITY DEFINER RPC instead of opening up read access to the whole table.
create or replace function machine_earthwork_progress(
  p_project uuid,
  p_category text,
  p_machine_type text,
  p_from date,
  p_to date
)
returns table (
  machine_id uuid,
  machine_name text,
  capacity numeric,
  total_trips numeric,
  total_hours numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id as machine_id, m.machine_name, m.capacity,
    coalesce(sum(w.trip_count), 0) as total_trips,
    coalesce(sum(w.total_reading), 0) as total_hours
  from machines m
  join work_logs w on w.machine_id = m.id
  where m.category = p_category
    and m.machine_type = p_machine_type
    and w.project_id = p_project
    and w.work_date >= p_from
    and w.work_date <= p_to
  group by m.id, m.machine_name, m.capacity
  order by m.machine_name;
$$;

grant execute on function machine_earthwork_progress(uuid, text, text, date, date) to anon, authenticated;

-- Total diesel consumed on a project (site) in a date range, across all machines/categories.
create or replace function site_diesel_total(p_project uuid, p_from date, p_to date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(diesel_qty), 0)
  from work_logs
  where project_id = p_project
    and work_date >= p_from
    and work_date <= p_to;
$$;

grant execute on function site_diesel_total(uuid, date, date) to anon, authenticated;
