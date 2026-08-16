-- Fix fuel_performance(): "actual" was computed as total_reading/diesel_qty for every
-- category, which is correct for Vehicles (km per liter — higher is better) but wrong for
-- Machines, which are rated by diesel burn RATE (liters per hour — lower is better).
-- Real historical data (excavators averaging ~25 L/hr against an expected ~13) exposed this.

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
    case
      when m.category = 'Machine' then
        case when sum(w.total_reading) > 0 then round(sum(w.diesel_qty) / sum(w.total_reading), 2) else 0 end
      else
        case when sum(w.diesel_qty) > 0 then round(sum(w.total_reading) / sum(w.diesel_qty), 2) else 0 end
    end as actual,
    coalesce(sum(w.total_reading), 0) as hours,
    coalesce(sum(w.diesel_qty), 0) as diesel
  from machines m
  join work_logs w on w.machine_id = m.id
  where m.subdivision_id = p_subdivision
    and (p_category is null or m.category = p_category)
    and (p_machine_id is null or m.id = p_machine_id)
    and (p_from is null or w.work_date >= p_from)
    and (p_to is null or w.work_date <= p_to)
  group by m.id, m.machine_name, m.category, m.expected_efficiency;
$$;

grant execute on function fuel_performance(uuid, text, uuid, date, date) to anon, authenticated;
