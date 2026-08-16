-- MDA Earthwork Data Acquisition System — initial schema
-- Mirrors the legacy Google Sheets model (subdivisions/machines/staff/projects/work logs)
-- plus new tables for GPS, attendance and pending-payment reporting.

create extension if not exists "pgcrypto";

-- ============================================================
-- CORE MASTER DATA
-- ============================================================

create table subdivisions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subdivision_id uuid references subdivisions (id),
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  name text not null,
  role text not null check (role in ('Driver', 'Operator')),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table machines (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  machine_type text not null,
  machine_name text not null,
  category text not null check (category in ('Machine', 'Vehicle')),
  expected_efficiency numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (subdivision_id, machine_name)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  work_type text not null,
  project_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DAILY WORK LOG (public entry form)
-- ============================================================

create table work_logs (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  work_date date not null,
  work_type text not null,
  project_id uuid references projects (id),
  machine_id uuid not null references machines (id),
  staff_id uuid not null references staff (id),
  diesel_qty numeric not null default 0,
  diesel_time time,
  diesel_reading numeric,
  start_reading numeric not null,
  end_reading numeric not null,
  total_reading numeric generated always as (end_reading - start_reading) stored,
  shift1_start time,
  shift1_end time,
  shift2_start time,
  shift2_end time,
  total_shift_hours numeric,
  trip_count integer,
  location_from_to text,
  remark text,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_reading > start_reading)
);

create index work_logs_subdivision_date_idx on work_logs (subdivision_id, work_date);
create index work_logs_machine_idx on work_logs (machine_id);

-- ============================================================
-- GPS / ATTENDANCE / PENDING PAYMENTS (admin-entered)
-- ============================================================

create table gps_logs (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  machine_id uuid not null references machines (id),
  work_log_id uuid references work_logs (id),
  recorded_at timestamptz not null default now(),
  latitude numeric not null,
  longitude numeric not null,
  location_label text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index gps_logs_subdivision_date_idx on gps_logs (subdivision_id, recorded_at);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  staff_id uuid not null references staff (id),
  attendance_date date not null,
  status text not null check (status in ('Present', 'Absent', 'Half Day', 'Leave')),
  remarks text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (staff_id, attendance_date)
);

create index attendance_subdivision_date_idx on attendance (subdivision_id, attendance_date);

create table pending_payments (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  category text not null check (category in ('Diesel Bill', 'Contractor Payment', 'Staff Wage', 'Other')),
  party_name text not null,
  amount numeric not null check (amount > 0),
  due_date date,
  status text not null default 'Pending' check (status in ('Pending', 'Paid')),
  remarks text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index pending_payments_subdivision_idx on pending_payments (subdivision_id, status);

-- ============================================================
-- HELPER: current admin's subdivision / role
-- ============================================================

create or replace function current_profile()
returns profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from profiles where id = auth.uid();
$$;

create or replace function is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'superadmin', false);
$$;

create or replace function admin_subdivision_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select subdivision_id from profiles where id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table subdivisions enable row level security;
alter table profiles enable row level security;
alter table staff enable row level security;
alter table machines enable row level security;
alter table projects enable row level security;
alter table work_logs enable row level security;
alter table gps_logs enable row level security;
alter table attendance enable row level security;
alter table pending_payments enable row level security;

-- Public master data: readable by anyone (needed for the public entry form's dropdowns)
create policy subdivisions_select_all on subdivisions for select using (true);
create policy staff_select_all on staff for select using (true);
create policy machines_select_all on machines for select using (true);
create policy projects_select_all on projects for select using (true);

-- Master data writes: admin of matching subdivision, or superadmin
create policy staff_write_admin on staff for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());

create policy machines_write_admin on machines for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());

create policy projects_write_admin on projects for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());

-- profiles: a user can read/update their own row; superadmin reads all
create policy profiles_select_own on profiles for select
  using (id = auth.uid() or is_superadmin());
create policy profiles_update_own on profiles for update
  using (id = auth.uid());

-- work_logs: public insert (matches legacy publicly-reachable submit endpoint),
-- read/update/delete restricted to the owning subdivision's admin (or superadmin).
-- Raw rows are never exposed to the public fuel dashboard — that goes through the
-- fuel_performance() RPC below instead.
create policy work_logs_insert_public on work_logs for insert with check (true);
create policy work_logs_select_admin on work_logs for select
  using (is_superadmin() or subdivision_id = admin_subdivision_id());
create policy work_logs_modify_admin on work_logs for update
  using (is_superadmin() or subdivision_id = admin_subdivision_id());
create policy work_logs_delete_admin on work_logs for delete
  using (is_superadmin() or subdivision_id = admin_subdivision_id());

-- gps_logs / attendance / pending_payments: admin-only, scoped to their subdivision
create policy gps_logs_admin_all on gps_logs for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());

create policy attendance_admin_all on attendance for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());

create policy pending_payments_admin_all on pending_payments for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());

-- ============================================================
-- FUEL PERFORMANCE RPC (public, aggregate-only)
-- ============================================================

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
    and (p_category is null or m.category = p_category)
    and (p_machine_id is null or m.id = p_machine_id)
    and (p_from is null or w.work_date >= p_from)
    and (p_to is null or w.work_date <= p_to)
  group by m.id, m.machine_name, m.category, m.expected_efficiency;
$$;

grant execute on function fuel_performance(uuid, text, uuid, date, date) to anon, authenticated;
