-- Replaces the invented lat/lng GPS log feature with the real legacy workflow:
-- admin enters a single daily GPS-meter reading per machine (same continuity model as
-- the dashboard reading), and per-day hours/km is derived as the diff between
-- consecutive readings. Also adds the per-machine hourly/km rate needed to compute
-- the Pending Amount report (hours used x rate), matching the legacy calculation.

drop table if exists gps_logs;

alter table machines add column rate numeric;

create table gps_readings (
  id uuid primary key default gen_random_uuid(),
  subdivision_id uuid not null references subdivisions (id),
  machine_id uuid not null references machines (id),
  reading_date date not null,
  reading numeric not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (machine_id, reading_date)
);

create index gps_readings_machine_date_idx on gps_readings (machine_id, reading_date);

alter table gps_readings enable row level security;

create policy gps_readings_admin_all on gps_readings for all
  using (is_superadmin() or subdivision_id = admin_subdivision_id())
  with check (is_superadmin() or subdivision_id = admin_subdivision_id());
