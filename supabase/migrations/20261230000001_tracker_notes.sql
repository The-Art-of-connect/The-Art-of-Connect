-- Development Tracker: remove outdated "next step" notes and point Journey items to the new one-step activation.
update public.dev_tracker set next_step = null, updated_at = now() where key in ('intelligence-center', 'tracker', 'db-tool');
update public.dev_tracker set next_step = replace(next_step, 'Apply database migrations; then ', ''), updated_at = now() where next_step like 'Apply database migrations; then %';
update public.dev_tracker set next_step = replace(replace(next_step, 'Apply database migrations; ', ''), 'Apply database migrations.', 'Opens with The Personal Society.'), updated_at = now() where next_step like '%Apply database migrations%';
update public.dev_tracker set next_step = 'Owner: press “Activate Journey for private testing” at the top of the Journey Intelligence Center, then test.', updated_at = now()
  where key in ('journey-text', 'universal-journey', 'discovery-sessions', 'journey-analyses', 'eval', 'financial-controls');
update public.dev_tracker set next_step = 'Owner: in Activate & test Journey, keep “Enable live voice” checked, save, then try Talk to Journey.', updated_at = now() where key = 'journey-voice';
