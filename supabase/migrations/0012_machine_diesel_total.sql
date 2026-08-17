-- Per-machine diesel breakdown for a project + date range, for the "घेतलेले डिझेल"
-- section of the public progress dashboard (previously only a single project-wide
-- total via site_diesel_total). Same public/aggregate-only RPC pattern as
-- machine_earthwork_progress — raw work_logs stays admin-only.
create or replace function machine_diesel_total(p_project uuid, p_from date, p_to date)
returns table (
  machine_id uuid,
  machine_name text,
  category text,
  total_diesel numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id as machine_id, m.machine_name, m.category,
    coalesce(sum(w.diesel_qty), 0) as total_diesel
  from machines m
  join work_logs w on w.machine_id = m.id
  where w.project_id = p_project
    and w.work_date >= p_from
    and w.work_date <= p_to
    and w.status = 'approved'
  group by m.id, m.machine_name, m.category
  having coalesce(sum(w.diesel_qty), 0) > 0
  order by m.machine_name;
$$;

grant execute on function machine_diesel_total(uuid, date, date) to anon, authenticated;
