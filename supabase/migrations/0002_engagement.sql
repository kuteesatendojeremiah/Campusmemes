-- Phase 4: counters, notifications, trending, share tracking.

-- Trending: laughs + comments + shares, decaying with age.
create or replace function public.refresh_score(p_meme uuid) returns void
language sql security definer set search_path = public as $$
  update public.memes set trending_score =
    (laugh_count + 2 * comment_count + 3 * share_count + 1)
    / power(extract(epoch from (now() - created_at)) / 3600 + 2, 1.5)
  where id = p_meme;
$$;

-- Recompute every meme (run every 15 minutes so older memes decay).
create or replace function public.recompute_trending() returns void
language sql security definer set search_path = public as $$
  update public.memes set trending_score =
    (laugh_count + 2 * comment_count + 3 * share_count + 1)
    / power(extract(epoch from (now() - created_at)) / 3600 + 2, 1.5)
  where status = 'visible' and created_at > now() - interval '30 days';
$$;

do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('recompute-trending', '*/15 * * * *', 'select public.recompute_trending()');
exception when others then
  raise notice 'pg_cron not available: enable it in Database > Extensions, then run: select cron.schedule(''recompute-trending'', ''*/15 * * * *'', ''select public.recompute_trending()'');';
end $$;

-- Laughs
create or replace function public.on_laugh() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    update public.memes set laugh_count = laugh_count + 1 where id = new.meme_id returning author_id into author;
    if author is not null and author <> new.user_id then
      insert into public.notifications (user_id, kind, data) values (author, 'laugh', jsonb_build_object('meme_id', new.meme_id));
    end if;
    insert into public.analytics_events (event, user_id, meme_id) values ('laugh', new.user_id, new.meme_id);
    perform public.refresh_score(new.meme_id);
  else
    update public.memes set laugh_count = greatest(laugh_count - 1, 0) where id = old.meme_id;
    perform public.refresh_score(old.meme_id);
  end if;
  return null;
end $$;
create trigger laughs_counter after insert or delete on public.laughs for each row execute function public.on_laugh();

-- Comments
create or replace function public.on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    update public.memes set comment_count = comment_count + 1 where id = new.meme_id returning author_id into author;
    if author is not null and author <> new.author_id then
      insert into public.notifications (user_id, kind, data) values (author, 'comment', jsonb_build_object('meme_id', new.meme_id));
    end if;
    insert into public.analytics_events (event, user_id, meme_id) values ('comment', new.author_id, new.meme_id);
    perform public.refresh_score(new.meme_id);
  else
    update public.memes set comment_count = greatest(comment_count - 1, 0) where id = old.meme_id;
    perform public.refresh_score(old.meme_id);
  end if;
  return null;
end $$;
create trigger comments_counter after insert or delete on public.comments for each row execute function public.on_comment();

-- New memes: starting score, template use, challenge entry
create or replace function public.on_meme_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.template_id is not null then
    update public.templates set uses_count = uses_count + 1 where id = new.template_id;
    insert into public.analytics_events (event, user_id, meme_id, template_id) values ('template_used', new.author_id, new.id, new.template_id);
  end if;
  if new.challenge_id is not null then
    insert into public.analytics_events (event, user_id, meme_id, challenge_id) values ('challenge_entry', new.author_id, new.id, new.challenge_id);
  end if;
  perform public.refresh_score(new.id);
  return null;
end $$;
create trigger memes_after_insert after insert on public.memes for each row execute function public.on_meme_insert();

-- Share tracking (called when a user shares a meme)
create or replace function public.record_share(p_meme uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.memes set share_count = share_count + 1 where id = p_meme;
  insert into public.analytics_events (event, user_id, meme_id) values ('share', auth.uid(), p_meme);
  perform public.refresh_score(p_meme);
end $$;
grant execute on function public.record_share(uuid) to authenticated;
