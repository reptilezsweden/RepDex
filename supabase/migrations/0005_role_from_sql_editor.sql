-- Let the SQL editor (no signed-in app user) set roles, e.g. to make the first admin.
-- App users still need to be admin; row-level security stops them reaching other profiles.
create or replace function public.protect_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;
