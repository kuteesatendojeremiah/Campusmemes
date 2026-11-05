-- Phase 5: finish challenges, award top-3 badges, feature winners for a week.

alter table public.challenges add column if not exists finalized_at timestamptz;

create or replace function public.finalize_challenges() returns integer
language plpgsql security definer set search_path = public as $$
declare c record; n integer := 0;
begin
  for c in select id, ends_at from public.challenges where ends_at < now() and finalized_at is null loop
    insert into public.challenge_badges (challenge_id, meme_id, user_id, rank)
    select c.id, t.id, t.author_id, t.rk from (
      select m.id, m.author_id,
             row_number() over (order by m.laugh_count desc, m.comment_count desc, m.share_count desc, m.created_at) as rk
      from public.memes m where m.challenge_id = c.id and m.status = 'visible'
    ) t where t.rk <= 3
    on conflict do nothing;

    insert into public.notifications (user_id, kind, data)
    select b.user_id, 'challenge_result', jsonb_build_object('challenge_id', c.id, 'meme_id', b.meme_id, 'rank', b.rank)
    from public.challenge_badges b where b.challenge_id = c.id;

    update public.challenges set finalized_at = now(), featured_until = c.ends_at + interval '7 days' where id = c.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Only the server (service role) and the cron job may run it.
revoke execute on function public.finalize_challenges() from public, anon, authenticated;

do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('finalize-challenges', '0 * * * *', 'select public.finalize_challenges()');
exception when others then
  raise notice 'pg_cron not available; the app also finalizes challenges when Explore loads.';
end $$;
