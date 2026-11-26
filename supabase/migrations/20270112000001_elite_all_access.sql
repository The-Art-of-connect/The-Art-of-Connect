-- Elite Membership — All Access: the founder's benefits list (November 26, 2026).
-- Journey allowances are stated exactly as configured (journey_tier_limits: 750 messages and 300 voice minutes a month).
update public.membership_packages set
  description = 'Elite Membership — All Access.',
  benefits = array[
    'All Singles, Couples and Business services',
    'All educational courses and relationship assessments',
    'Unlimited compatibility assessments and matching',
    'Access to all eligible circles and exclusive Elite communities',
    'Networking and business connections',
    'Personal growth and self-discovery resources',
    'All relationship and communication tools',
    'Full access to Journey AI''s text-based guidance (up to 750 messages a month)',
    'Included Journey live voice conversations (300 minutes a month)',
    'Access to new platform features as they are released'
  ]
where slug = 'elite-concierge';
