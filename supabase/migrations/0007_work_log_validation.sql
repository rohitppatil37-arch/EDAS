-- Admin validation queue: driver submissions land as 'pending' and only count toward
-- reports/dashboards/attendance once an admin approves them. Existing rows are
-- grandfathered as 'approved' so current reports/dashboards don't go blank.

alter table work_logs
  add column status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  add column reviewed_by uuid references auth.users (id),
  add column reviewed_at timestamptz,
  add column review_note text;

update work_logs set status = 'approved', reviewed_at = created_at where status = 'pending';

create index work_logs_subdivision_status_idx on work_logs (subdivision_id, status);

-- Public dashboards/RPCs only aggregate approved rows. The reading-continuity check
-- (get_previous_end_reading) deliberately still looks at the latest row regardless of
-- status — it's a data-entry sanity check, not a re-verification of admin's review, and
-- gating it on approval would block a driver's next submission until admin catches up.

create or replace function fuel_performance(
  p_subdivision uuid,
  p_category text default null,
  p_machine_id uuid default null,
  p_from date default null,
  p_to date default null
)
returns table (
  machine_id uuid,
  machine text,
  category text,
  expected numeric,
  actual numeric,
  hours numeric,
  diesel numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as machine_id,
    m.machine_name as machine,
    m.category,
    coalesce(m.expected_efficiency, 0) as expected,
    case when sum(w.diesel_qty) > 0
      then round(sum(w.total_reading) / sum(w.diesel_qty), 2)
      else 0
    end as actual,
    coalesce(sum(w.total_reading), 0) as hours,
    coalesce(sum(w.diesel_qty), 0) as diesel
  from machines m
  join work_logs w on w.machine_id = m.id
  where m.subdivision_id = p_subdivision
    and w.status = 'approved'
    and (p_category is null or m.category = p_category)
    and (p_machine_id is null or m.id = p_machine_id)
    and (p_from is null or w.work_date >= p_from)
    and (p_to is null or w.work_date <= p_to)
  group by m.id, m.machine_name, m.category, m.expected_efficiency;
$$;

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
    and w.status = 'approved'
  group by m.id, m.machine_name, m.capacity
  order by m.machine_name;
$$;

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
    and work_date <= p_to
    and status = 'approved';
$$;
