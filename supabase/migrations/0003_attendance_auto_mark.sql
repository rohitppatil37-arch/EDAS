-- Track whether an attendance record came from a work-log submission (auto) or an admin (manual).
alter table attendance
  add column source text not null default 'manual' check (source in ('manual', 'auto'));

-- Lets the public work-log form mark a staff member present for the day without granting
-- public write access to the attendance table (RLS on attendance stays admin-only).
create or replace function mark_attendance_present(p_subdivision uuid, p_staff uuid, p_date date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into attendance (subdivision_id, staff_id, attendance_date, status, source)
  values (p_subdivision, p_staff, p_date, 'Present', 'auto')
  on conflict (staff_id, attendance_date)
  do update set status = 'Present', source = 'auto', subdivision_id = excluded.subdivision_id;
$$;

grant execute on function mark_attendance_present(uuid, uuid, date) to anon, authenticated;
