-- Female twins of battle-only forms are battle-only too (form_type 'Battle-Only Form', not 'Gender'),
-- so they can't be ticked or counted, like their original.
-- A twin's form_type now always follows its original: 'Battle-Only Form' when the original is one,
-- otherwise 'Gender'.

create or replace function public.pokemon_twin_form_type() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.form_type := case
    when (select o.form_type from public.pokemon o where o.id = new.gender_of) = 'Battle-Only Form' then 'Battle-Only Form'
    else 'Gender' end;
  return new;
end;
$$;
drop trigger if exists pokemon_twin_form_type on public.pokemon;
create trigger pokemon_twin_form_type before insert or update on public.pokemon
  for each row when (new.gender_of is not null) execute function public.pokemon_twin_form_type();

-- When an original's form_type changes, its twin follows.
create or replace function public.pokemon_twin_follow_form_type() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.pokemon t
  set form_type = case when new.form_type = 'Battle-Only Form' then 'Battle-Only Form' else 'Gender' end
  where t.gender_of = new.id
    and t.form_type is distinct from case when new.form_type = 'Battle-Only Form' then 'Battle-Only Form' else 'Gender' end;
  return null;
end;
$$;
drop trigger if exists pokemon_twin_follow_form_type on public.pokemon;
create trigger pokemon_twin_follow_form_type after update of form_type on public.pokemon
  for each row when (new.gender_of is null and old.form_type is distinct from new.form_type)
  execute function public.pokemon_twin_follow_form_type();

select set_config('repdex.source', 'import', true);

update public.pokemon t set form_type = 'Battle-Only Form'
from public.pokemon o
where t.gender_of = o.id and o.form_type = 'Battle-Only Form' and t.form_type <> 'Battle-Only Form';
