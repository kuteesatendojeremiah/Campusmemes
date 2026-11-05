-- Phase 8: revenue. Premium, tips, withdrawals, campaign answers. Run once in the Supabase SQL editor.

-- ───────── columns ─────────
alter table public.ledger add column if not exists creator_id uuid references public.profiles(id) on delete set null;
create index if not exists ledger_creator_idx on public.ledger (creator_id, created_at desc);

-- Premium cosmetics (validated server-side: only active Premium users can set them).
alter table public.profiles add column if not exists avatar_frame text;
alter table public.profiles add column if not exists alias_style text;

-- Tip notifications.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('laugh','comment','challenge_result','moderation','campaign','tip'));

-- Creators may answer an invitation (accept / decline) but never change their payout.
revoke update on public.campaign_creators from authenticated;
grant update (status) on public.campaign_creators to authenticated;

-- ───────── money functions (server / service role only) ─────────
-- Withdrawable balance = tips received − platform fee on them − withdrawals (pending or done).
create or replace function public.creator_balance(p_user uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(
    case
      when kind = 'tip' and creator_id = p_user and status = 'completed' then amount
      when kind = 'platform_fee' and creator_id = p_user and status = 'completed' then -amount
      when kind = 'withdrawal' and user_id = p_user and status in ('pending','completed') then -amount
      else 0
    end), 0)
  from public.ledger
  where creator_id = p_user or user_id = p_user;
$$;

-- Starts a withdrawal atomically: locks per user so two requests can't spend the same balance.
create or replace function public.start_withdrawal(p_user uuid, p_amount numeric, p_msisdn text, p_min numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('withdraw:' || p_user::text));
  if p_amount < p_min then raise exception 'below_minimum'; end if;
  if public.creator_balance(p_user) < p_amount then raise exception 'insufficient'; end if;
  insert into public.ledger (kind, user_id, amount, provider, status)
  values ('withdrawal', p_user, p_amount, null, 'pending')
  returning id into new_id;
  return new_id;
end $$;

-- Adds 30 days of Premium (stacking on any time left).
create or replace function public.grant_premium(p_user uuid, p_days integer default 30) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare until_ts timestamptz;
begin
  update public.profiles
  set is_premium = true,
      premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => p_days)
  where id = p_user
  returning premium_until into until_ts;
  return until_ts;
end $$;

revoke execute on function public.creator_balance(uuid) from public, anon, authenticated;
revoke execute on function public.start_withdrawal(uuid, numeric, text, numeric) from public, anon, authenticated;
revoke execute on function public.grant_premium(uuid, integer) from public, anon, authenticated;
