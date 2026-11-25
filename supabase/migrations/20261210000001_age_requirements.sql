-- ════════════════════════════════════════════════════════════════════
-- Age requirements (founder decision, 2026-11-25)
--   • In Business, In Life and couples (both partners): 21+
--   • The Personal Society singles: 30+
--   • Professional providers: 21+ with applicable credentials
--   • Legal documents: the new wording is written into each document's
--     working draft. Published text is never changed — where a document is
--     already approved or published, a new draft is created for owner and
--     attorney review, then publication.
-- ════════════════════════════════════════════════════════════════════

update public.platform_settings set value = '21' where key = 'minimum_member_age';
update public.platform_settings set value = '21' where key = 'minimum_professional_age';
insert into public.platform_settings (key, value, description) values
  ('minimum_singles_age', '30', 'Minimum age for The Personal Society singles experience (matchmaking)')
on conflict (key) do update set value = excluded.value;

-- Package descriptions
update public.membership_packages set description = replace(description, 'accomplished adults 40+', 'accomplished adults')
  where description like '%adults 40+%';
update public.membership_packages set description = replace(description, 'single adults 40+', 'single adults 30+')
  where description like '%single adults 40+%';
update public.launch_checklist set title = 'Original imagery of diverse adults', description = replace(coalesce(description, ''), 'adults 40+', 'adults')
  where key = 'imagery';

-- Singles 30+ is enforced by the database: a member younger than the singles
-- minimum can never be shown in singles matchmaking.
create or replace function relationships.guard_singles_age()
returns trigger language plpgsql security definer set search_path = public, relationships as $$
declare dob date;
begin
  if new.track = 'single' and new.is_visible then
    select date_of_birth into dob from public.member_private where user_id = new.user_id;
    if dob is null or dob > (current_date - make_interval(years => public.setting_int('minimum_singles_age', 30))) then
      raise exception 'The Personal Society singles experience is for members 30 and older.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_singles_age on relationships.profiles;
create trigger guard_singles_age before insert or update of track, is_visible on relationships.profiles
  for each row execute function relationships.guard_singles_age();

-- Legal wording
do $$
declare v record; locked public.legal_status[] := array['approved','scheduled','published','archived']::public.legal_status[];
  new_body text; new_summary text;
begin
  for v in
    select distinct on (document_slug) * from public.legal_document_versions v order by document_slug, created_at desc
  loop
    new_body := replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(v.body, 'Our system will not create a consumer membership account for anyone younger than the minimum age, which is currently 40. The minimum age is set by the owner and can be raised.', 'Our system will not create a consumer membership account for anyone younger than the minimum age, which is currently 21 (30 for The Personal Society singles experience). The minimum ages are set by the owner and can be raised.'), 'Romance scams and financial fraud cause real harm, and adults over 40 are frequent targets.', 'Romance scams and financial fraud cause real harm, and they target adults of every age.'), 'The Personal Society is designed for adults aged 40 and older who want', 'The Personal Society is designed for singles aged 30 and older, and for couples in which both partners are 21 or older, who want'), 'Both partners must be adults aged 40 or older (or any higher minimum age we set)', 'Both partners must be adults aged 21 or older (or any higher minimum age we set)'), 'accomplished adults aged 40 and older', 'accomplished adults aged 21 and older'), 'wants every adult aged 40 and older to be able', 'wants every adult to be able'), 'confirms that members are 40 or older', 'confirms that members meet our age requirements'), 'a community exclusively for adults aged **40 and older**.', 'a community for adults aged **21 and older**; The Personal Society singles experience is for adults aged **30 and older**.'), 'Consumer memberships are available only to adults aged **40 or older**, or any higher minimum age we publish.', 'Consumer memberships are available only to adults aged **21 or older**, and The Personal Society singles experience only to adults aged **30 or older**, or any higher minimum age we publish.'), 'Consumer membership is limited to adults aged 40 and older.', 'Consumer membership is limited to adults aged 21 and older, and The Personal Society singles experience to adults aged 30 and older.'), 'You must be **40 or older** (or meet any higher minimum age we publish)', 'You must be **21 or older** (**30 or older** for The Personal Society singles experience, or any higher minimum age we publish)'), 'to confirm you are 40 or older', 'to confirm you meet our age requirements (21 or older; 30 or older for singles)'), 'verifying that you are 40 or older', 'verifying that you meet our age requirements'), 'Our services are only for adults aged 40 and older.', 'Our services are only for adults aged 21 and older.'), 'adults aged **40 and older**', 'adults aged **21 and older**'), 'adults aged 40 and older', 'adults aged 21 and older');
    new_summary := replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(v.summary, 'Our system will not create a consumer membership account for anyone younger than the minimum age, which is currently 40. The minimum age is set by the owner and can be raised.', 'Our system will not create a consumer membership account for anyone younger than the minimum age, which is currently 21 (30 for The Personal Society singles experience). The minimum ages are set by the owner and can be raised.'), 'Romance scams and financial fraud cause real harm, and adults over 40 are frequent targets.', 'Romance scams and financial fraud cause real harm, and they target adults of every age.'), 'The Personal Society is designed for adults aged 40 and older who want', 'The Personal Society is designed for singles aged 30 and older, and for couples in which both partners are 21 or older, who want'), 'Both partners must be adults aged 40 or older (or any higher minimum age we set)', 'Both partners must be adults aged 21 or older (or any higher minimum age we set)'), 'accomplished adults aged 40 and older', 'accomplished adults aged 21 and older'), 'wants every adult aged 40 and older to be able', 'wants every adult to be able'), 'confirms that members are 40 or older', 'confirms that members meet our age requirements'), 'a community exclusively for adults aged **40 and older**.', 'a community for adults aged **21 and older**; The Personal Society singles experience is for adults aged **30 and older**.'), 'Consumer memberships are available only to adults aged **40 or older**, or any higher minimum age we publish.', 'Consumer memberships are available only to adults aged **21 or older**, and The Personal Society singles experience only to adults aged **30 or older**, or any higher minimum age we publish.'), 'Consumer membership is limited to adults aged 40 and older.', 'Consumer membership is limited to adults aged 21 and older, and The Personal Society singles experience to adults aged 30 and older.'), 'You must be **40 or older** (or meet any higher minimum age we publish)', 'You must be **21 or older** (**30 or older** for The Personal Society singles experience, or any higher minimum age we publish)'), 'to confirm you are 40 or older', 'to confirm you meet our age requirements (21 or older; 30 or older for singles)'), 'verifying that you are 40 or older', 'verifying that you meet our age requirements'), 'Our services are only for adults aged 40 and older.', 'Our services are only for adults aged 21 and older.'), 'adults aged **40 and older**', 'adults aged **21 and older**'), 'adults aged 40 and older', 'adults aged 21 and older');
    if new_body = v.body and new_summary = v.summary then continue; end if;
    if v.status = any (locked) then
      insert into public.legal_document_versions (document_slug, version_label, title, summary, body, change_summary)
      values (v.document_slug, 'age-update-2026-11', v.title, new_summary, new_body,
              'Age requirements updated: members 21+, couples 21+ for both partners, Personal Society singles 30+, professionals 21+.')
      on conflict (document_slug, version_label) do nothing;
    else
      update public.legal_document_versions
        set body = new_body, summary = new_summary,
            change_summary = trim(both ' ' from coalesce(change_summary, '') || ' Age requirements updated: members 21+, singles 30+.')
        where id = v.id;
    end if;
  end loop;
end $$;
