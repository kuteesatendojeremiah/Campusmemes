-- CampusMemes schema (Phase 1). Row Level Security is enabled on every table.

create extension if not exists pgcrypto;

-- ───────── helpers ─────────
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- ───────── users ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null unique,
  avatar text not null default '😎',
  alias_changed_at timestamptz,
  is_premium boolean not null default false,
  premium_until timestamptz,
  data_saver boolean not null default false,
  accepted_rules_at timestamptz,
  status text not null default 'active' check (status in ('active','suspended','banned')),
  suspended_until timestamptz,
  created_at timestamptz not null default now()
);

-- Phone numbers live in a private table: only admins can read them.
create table public.user_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null,
  payout_msisdn text
);

create table public.banned_phones (
  phone text primary key,
  reason text,
  banned_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ───────── content ─────────
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  emoji text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.topic_members (
  user_id uuid references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  primary key (user_id, topic_id)
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  link_url text,
  category text not null default 'general' check (category <> 'betting'), -- betting/gambling is blocked
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  template_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  prize text,
  sponsor_id uuid references public.sponsors(id),
  amount_paid numeric(12,2),
  featured_until timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  sponsor_id uuid references public.sponsors(id),
  premium_only boolean not null default false,
  sponsored_from timestamptz,
  sponsored_until timestamptz,
  uses_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.challenges add foreign key (template_id) references public.templates(id);

create table public.sticker_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sponsor_id uuid references public.sponsors(id),
  premium_only boolean not null default false,
  sponsored_from timestamptz,
  sponsored_until timestamptz,
  active boolean not null default true
);

create table public.stickers (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.sticker_packs(id) on delete cascade,
  image_url text not null
);

create table public.memes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id),
  challenge_id uuid references public.challenges(id),
  template_id uuid references public.templates(id),
  image_url text not null,
  thumb_url text,
  caption text,
  laugh_count integer not null default 0,
  comment_count integer not null default 0,
  share_count integer not null default 0,
  trending_score double precision not null default 0,
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now(),
  check (topic_id is not null or challenge_id is not null)
);
create index memes_feed_idx on public.memes (status, created_at desc);
create index memes_trending_idx on public.memes (status, trending_score desc);
create index memes_topic_idx on public.memes (topic_id);
create index memes_challenge_idx on public.memes (challenge_id);

create table public.laughs (
  user_id uuid references public.profiles(id) on delete cascade,
  meme_id uuid references public.memes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, meme_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  meme_id uuid not null references public.memes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade, -- one level deep, enforced below
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now()
);
create index comments_meme_idx on public.comments (meme_id, created_at);

create function public.comment_one_level() returns trigger language plpgsql as $$
begin
  if new.parent_id is not null and exists (select 1 from public.comments where id = new.parent_id and parent_id is not null) then
    raise exception 'Replies can only be one level deep';
  end if;
  return new;
end $$;
create trigger comments_one_level before insert on public.comments for each row execute function public.comment_one_level();

create table public.challenge_badges (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  meme_id uuid not null references public.memes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  unique (challenge_id, rank)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('laugh','comment','challenge_result','moderation','campaign')),
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ───────── safety ─────────
create table public.blocklist (
  word text primary key,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  meme_id uuid references public.memes(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','kept','removed')),
  created_at timestamptz not null default now(),
  check ((meme_id is not null) <> (comment_id is not null)),
  unique (reporter_id, meme_id),
  unique (reporter_id, comment_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  action text not null check (action in ('keep','remove','warn','suspend','ban','unban','setting_change')),
  target_user uuid,
  target_meme uuid,
  target_comment uuid,
  note text,
  created_at timestamptz not null default now()
);

-- ───────── revenue ─────────
create table public.feed_ads (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id),
  title text not null,
  body text,
  image_url text,
  link_url text not null,
  topic_ids uuid[] not null default '{}',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  brief text,
  fee numeric(12,2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  results jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.campaign_creators (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','accepted','declined')),
  payout numeric(12,2) not null default 0,
  primary key (campaign_id, user_id)
);

create table public.campaign_memes (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  meme_id uuid references public.memes(id) on delete cascade,
  primary key (campaign_id, meme_id)
);

-- Ledger of every money movement. Amounts in UGX.
create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('premium','tip','platform_fee','withdrawal','campaign_payout','sponsor_payment')),
  user_id uuid references public.profiles(id) on delete set null,
  meme_id uuid references public.memes(id) on delete set null,
  amount numeric(12,2) not null,
  provider text,
  provider_ref text,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
create index ledger_user_idx on public.ledger (user_id, created_at desc);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('app_open','meme_view','laugh','comment','share','template_used','ad_impression','ad_tap','challenge_entry','premium_purchase','tip')),
  user_id uuid references public.profiles(id) on delete set null,
  meme_id uuid,
  challenge_id uuid,
  template_id uuid,
  ad_id uuid,
  sponsor_id uuid,
  created_at timestamptz not null default now()
);
create index analytics_event_idx on public.analytics_events (event, created_at);

-- Admin switches and numbers (revenue feature flags, tip %, premium price).
create table public.settings (
  key text primary key,
  value jsonb not null
);
insert into public.settings (key, value) values
  ('feature_sponsored_challenges', 'true'),
  ('feature_branded_templates', 'true'),
  ('feature_feed_ads', 'false'),
  ('feature_premium', 'false'),
  ('feature_tips', 'false'),
  ('feature_campaigns', 'true'),
  ('tip_fee_percent', '10'),
  ('premium_price_ugx', '3000'),
  ('ad_every_n_memes', '10'),
  ('max_posts_per_day', '20'),
  ('max_comments_per_day', '100'),
  ('reports_to_autohide', '3');

-- ───────── Row Level Security ─────────
alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.user_private enable row level security;
alter table public.banned_phones enable row level security;
alter table public.topics enable row level security;
alter table public.topic_members enable row level security;
alter table public.sponsors enable row level security;
alter table public.challenges enable row level security;
alter table public.templates enable row level security;
alter table public.sticker_packs enable row level security;
alter table public.stickers enable row level security;
alter table public.memes enable row level security;
alter table public.laughs enable row level security;
alter table public.comments enable row level security;
alter table public.challenge_badges enable row level security;
alter table public.notifications enable row level security;
alter table public.blocklist enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.feed_ads enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_creators enable row level security;
alter table public.campaign_memes enable row level security;
alter table public.ledger enable row level security;
alter table public.analytics_events enable row level security;
alter table public.settings enable row level security;

-- admins table: only admins can see it; changes only via the service role.
create policy admins_read on public.admins for select using (public.is_admin());

-- profiles: aliases are public; users edit only their own non-sensitive fields.
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_admin on public.profiles for all using (public.is_admin());
-- Stop users from granting themselves premium or lifting a ban.
revoke update on public.profiles from authenticated;
grant update (alias, avatar, alias_changed_at, data_saver, accepted_rules_at) on public.profiles to authenticated;

-- phone numbers: admin only. A user may read/write their own row (payout number) but never anyone else's.
create policy user_private_own on public.user_private for select using (auth.uid() = user_id or public.is_admin());
create policy banned_phones_admin on public.banned_phones for all using (public.is_admin());

-- public read-only catalogue tables; admins manage.
create policy topics_read on public.topics for select using (active or public.is_admin());
create policy topics_admin on public.topics for all using (public.is_admin());
create policy sponsors_read on public.sponsors for select using (active or public.is_admin());
create policy sponsors_admin on public.sponsors for all using (public.is_admin());
create policy challenges_read on public.challenges for select using (true);
create policy challenges_admin on public.challenges for all using (public.is_admin());
create policy templates_read on public.templates for select using (active or public.is_admin());
create policy templates_admin on public.templates for all using (public.is_admin());
create policy packs_read on public.sticker_packs for select using (active or public.is_admin());
create policy packs_admin on public.sticker_packs for all using (public.is_admin());
create policy stickers_read on public.stickers for select using (true);
create policy stickers_admin on public.stickers for all using (public.is_admin());
create policy feed_ads_read on public.feed_ads for select using (active and now() between starts_at and ends_at or public.is_admin());
create policy feed_ads_admin on public.feed_ads for all using (public.is_admin());

-- topic membership: own rows.
create policy topic_members_own on public.topic_members for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- memes: visible ones are public; authors insert/delete their own; admins moderate.
create policy memes_read on public.memes for select using (status = 'visible' or author_id = auth.uid() or public.is_admin());
create policy memes_insert on public.memes for insert with check (
  auth.uid() = author_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
);
create policy memes_delete_own on public.memes for delete using (auth.uid() = author_id);
create policy memes_admin on public.memes for all using (public.is_admin());

create policy laughs_read on public.laughs for select using (true);
create policy laughs_own_insert on public.laughs for insert with check (auth.uid() = user_id);
create policy laughs_own_delete on public.laughs for delete using (auth.uid() = user_id);

create policy comments_read on public.comments for select using (status = 'visible' or author_id = auth.uid() or public.is_admin());
create policy comments_insert on public.comments for insert with check (
  auth.uid() = author_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
);
create policy comments_delete_own on public.comments for delete using (auth.uid() = author_id);
create policy comments_admin on public.comments for all using (public.is_admin());

create policy badges_read on public.challenge_badges for select using (true);
create policy badges_admin on public.challenge_badges for all using (public.is_admin());

create policy notifications_own on public.notifications for select using (auth.uid() = user_id);
create policy notifications_mark_read on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- blocklist: only admins (the filter runs server-side with the service role).
create policy blocklist_admin on public.blocklist for all using (public.is_admin());

create policy reports_insert on public.reports for insert with check (auth.uid() = reporter_id);
create policy reports_admin on public.reports for all using (public.is_admin());
create policy moderation_admin on public.moderation_actions for all using (public.is_admin());

-- campaigns: admins manage; invited creators see and answer only their own invitation.
create policy campaigns_admin on public.campaigns for all using (public.is_admin());
create policy campaign_creators_own_read on public.campaign_creators for select using (auth.uid() = user_id or public.is_admin());
create policy campaign_creators_own_answer on public.campaign_creators for update using (auth.uid() = user_id) with check (auth.uid() = user_id and status in ('accepted','declined'));
create policy campaign_creators_admin on public.campaign_creators for all using (public.is_admin());
create policy campaign_memes_admin on public.campaign_memes for all using (public.is_admin());

-- ledger: users see their own rows; writes come only from the server (service role).
create policy ledger_own on public.ledger for select using (auth.uid() = user_id or public.is_admin());

-- analytics: anyone signed in can record their own events; only admins read.
create policy analytics_insert on public.analytics_events for insert with check (user_id is null or auth.uid() = user_id);
create policy analytics_admin on public.analytics_events for select using (public.is_admin());

-- settings: switches are readable by all (the app needs them); only admins change them.
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for all using (public.is_admin());

-- ───────── storage ─────────
insert into storage.buckets (id, name, public) values ('memes', 'memes', true), ('assets', 'assets', true)
on conflict do nothing;

create policy memes_bucket_read on storage.objects for select using (bucket_id in ('memes','assets'));
create policy memes_bucket_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'memes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy memes_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'memes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy assets_bucket_admin on storage.objects for all to authenticated
  using (bucket_id = 'assets' and public.is_admin()) with check (bucket_id = 'assets' and public.is_admin());
