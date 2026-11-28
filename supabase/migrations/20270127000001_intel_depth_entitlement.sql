-- In-depth research (more discovery and the deeper investigation processor) is part of Elite Concierge only.
create or replace function public.guard_intel_depth()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.depth = 'deep' and (tg_op = 'INSERT' or old.depth is distinct from 'deep') and public.intel_level(new.user_id) is distinct from 'elite' then
    raise exception 'In-depth research is part of Elite Concierge.';
  end if;
  return new;
end $$;
create trigger guard_intel_depth before insert or update of depth on public.intel_assignments for each row execute function public.guard_intel_depth();
