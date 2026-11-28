-- Journey's customer audit (November 28, 2026): the owner-listed fictional QA account may preview experiences that are not
-- yet open to members. Real members are unaffected: every launch switch still applies to them.
create or replace function public.is_qa_account(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select uid is not null and exists (
    select 1 from public.qa_switchers q join public.profiles p on p.id = q.user_id
    where q.user_id = uid and q.expires_at > now() and p.is_test
      and not exists (select 1 from public.staff_roles r where r.user_id = uid));
$$;
revoke all on function public.is_qa_account(uuid) from public, anon;
grant execute on function public.is_qa_account(uuid) to authenticated, service_role;

create or replace function public.has_experience(exp experience)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when exp = 'counseling' then exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
    else exists (
      select 1 from public.experience_access a
      join public.profiles p on p.id = a.user_id
      where a.user_id = auth.uid() and a.experience = exp and a.status = 'active' and a.source <> 'free_tier'
        and p.status = 'active' and (a.expires_at is null or a.expires_at > now()))
  end and (public.setting_enabled(exp::text || '_live') or public.is_qa_account(auth.uid()));
$$;
