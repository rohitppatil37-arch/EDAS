-- Lets an admin move a machine's home subdivision, either direction:
-- give one of their own machines to another subdivision, or bring a
-- machine belonging to another subdivision into their own. Direct RLS on
-- `machines` can't express this (the existing write policy only allows
-- touching rows that are already the caller's own subdivision), so this
-- uses a SECURITY DEFINER RPC instead, mirroring the "either side" write
-- rule already used for machine_deployments.

create or replace function transfer_machine(p_machine_id uuid, p_target_subdivision_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_subdivision uuid;
begin
  select subdivision_id into v_current_subdivision from machines where id = p_machine_id;
  if v_current_subdivision is null then
    raise exception 'Machine not found';
  end if;

  if not (
    is_superadmin()
    or admin_subdivision_id() = v_current_subdivision
    or admin_subdivision_id() = p_target_subdivision_id
  ) then
    raise exception 'Not authorized to transfer this machine';
  end if;

  update machines set subdivision_id = p_target_subdivision_id where id = p_machine_id;
end;
$$;

grant execute on function transfer_machine(uuid, uuid) to authenticated;

-- Broadcast machine row changes (including transfers above) to every
-- connected client so machine lists refresh live across the app.
alter publication supabase_realtime add table machines;
