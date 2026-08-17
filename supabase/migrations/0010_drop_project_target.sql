-- Target-based project progress (admin-entered sanctioned quantity) is dropped —
-- the homepage now just shows real totals per project, no target data entry needed.
drop function if exists project_progress(uuid[]);

alter table projects drop column target_quantity;

create or replace function project_progress(p_project_ids uuid[])
returns table (
  project_id uuid,
  project_name text,
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
    coalesce(sum(
      (case when m.category = 'Vehicle' then coalesce(w.trip_count, 0) else coalesce(w.total_reading, 0) end)
      * coalesce(m.capacity, 0)
    ), 0) as total_volume
  from projects p
  left join work_logs w on w.project_id = p.id and w.status = 'approved'
  left join machines m on m.id = w.machine_id
  where p.id = any(p_project_ids)
  group by p.id, p.project_name;
$$;

grant execute on function project_progress(uuid[]) to anon, authenticated;
