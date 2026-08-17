-- Machine deployment: admin assigns a machine to a project (often in a different
-- subdivision than the machine's home subdivision) for a date range. Public-readable
-- so the driver's work-log form can show a notice when the selected machine is
-- currently deployed, and so the machine can be selected under the target
-- subdivision's project even though it's not that subdivision's own machine.

create table machine_deployments (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references machines (id),
  subdivision_id uuid not null references subdivisions (id),
  project_id uuid not null references projects (id),
  start_date date not null,
  end_date date not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint machine_deployments_dates_check check (end_date >= start_date)
);

create index machine_deployments_machine_date_idx on machine_deployments (machine_id, start_date, end_date);
create index machine_deployments_subdivision_date_idx on machine_deployments (subdivision_id, start_date, end_date);

alter table machine_deployments enable row level security;

create policy machine_deployments_select_all on machine_deployments for select using (true);

-- Writable by an admin of either side of the deployment: the machine's home
-- subdivision (sending it out) or the target subdivision (receiving it).
create policy machine_deployments_write_admin on machine_deployments for all
  using (
    is_superadmin()
    or subdivision_id = admin_subdivision_id()
    or exists (
      select 1 from machines m
      where m.id = machine_deployments.machine_id and m.subdivision_id = admin_subdivision_id()
    )
  )
  with check (
    is_superadmin()
    or subdivision_id = admin_subdivision_id()
    or exists (
      select 1 from machines m
      where m.id = machine_deployments.machine_id and m.subdivision_id = admin_subdivision_id()
    )
  );
