-- Log added and deleted Pokémon and generation changes too, not only Pokémon edits.

create or replace function public.log_pokemon_insert_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.change_log (table_name, row_id, field, old_value, new_value, source, changed_by)
    values ('pokemon', new.id, '(added)', null, to_jsonb(new)::text,
            coalesce(current_setting('repdex.source', true), 'admin'), auth.uid());
    return new;
  else
    insert into public.change_log (table_name, row_id, field, old_value, new_value, source, changed_by)
    values ('pokemon', old.id, '(deleted)', to_jsonb(old)::text, null,
            coalesce(current_setting('repdex.source', true), 'admin'), auth.uid());
    return old;
  end if;
end;
$$;

drop trigger if exists pokemon_log_insert_delete on public.pokemon;
create trigger pokemon_log_insert_delete
  after insert or delete on public.pokemon
  for each row execute function public.log_pokemon_insert_delete();

create or replace function public.log_gens_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  k text;
  o jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  n jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  row_key text := coalesce(n ->> 'gen_nr', o ->> 'gen_nr');
begin
  for k in select jsonb_object_keys(o || n) loop
    if (o -> k) is distinct from (n -> k) then
      insert into public.change_log (table_name, row_id, field, old_value, new_value, source, changed_by)
      values ('gens', row_key, k, o ->> k, n ->> k, 'admin', auth.uid());
    end if;
  end loop;
  return coalesce(new, old);
end;
$$;

drop trigger if exists gens_log_change on public.gens;
create trigger gens_log_change
  after insert or update or delete on public.gens
  for each row execute function public.log_gens_change();
