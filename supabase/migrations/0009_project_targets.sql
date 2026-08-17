-- Per-project sanctioned target quantity (घ.मी.) for desilting/earthwork projects, so the
-- public homepage can show real progress-to-date against a goal instead of just raw totals.
-- Admin-editable (already covered by the existing projects_write_admin policy from 0001).
alter table projects add column target_quantity numeric;

-- Public, aggregate-only: total earthwork volume completed so far for a set of projects,
-- computed the same way as machine_earthwork_progress (trips*capacity for vehicles,
-- hours*capacity for machines), restricted to approved work logs. Raw work_logs stays
-- admin-only, so this is exposed narrowly via a SECURITY DEFINER RPC.
create or replace function project_progress(p_project_ids uuid[])
returns table (
  project_id uuid,
  project_name text,
  target_quantity numeric,
  total_volume numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as project_id,
    p.project_name,
    p.target_quantity,
    coalesce(sum(
      (case when m.category = 'Vehicle' then coalesce(w.trip_count, 0) else coalesce(w.total_reading, 0) end)
      * coalesce(m.capacity, 0)
    ), 0) as total_volume
  from projects p
  left join work_logs w on w.project_id = p.id and w.status = 'approved'
  left join machines m on m.id = w.machine_id
  where p.id = any(p_project_ids)
  group by p.id, p.project_name, p.target_quantity;
$$;

grant execute on function project_progress(uuid[]) to anon, authenticated;
