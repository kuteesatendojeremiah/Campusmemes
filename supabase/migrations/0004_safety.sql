-- Phase 6: safety. Posting now goes through the server (word filter, bans, rate limits),
-- and posts/comments are hidden automatically after enough reports.

-- Clients may no longer insert memes or comments directly; the server does it with the service role.
drop policy if exists memes_insert on public.memes;
drop policy if exists comments_insert on public.comments;

create or replace function public.on_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  threshold integer;
  n integer;
  author uuid;
begin
  select coalesce((value #>> '{}')::integer, 3) into threshold from public.settings where key = 'reports_to_autohide';
  threshold := coalesce(threshold, 3);

  if new.meme_id is not null then
    select count(distinct reporter_id) into n from public.reports where meme_id = new.meme_id and status = 'open';
    if n >= threshold then
      update public.memes set status = 'hidden' where id = new.meme_id and status = 'visible' returning author_id into author;
      if author is not null then
        insert into public.notifications (user_id, kind, data)
        values (author, 'moderation', jsonb_build_object('meme_id', new.meme_id, 'note', 'Your meme was hidden after reports and is being reviewed.'));
      end if;
    end if;
  else
    select count(distinct reporter_id) into n from public.reports where comment_id = new.comment_id and status = 'open';
    if n >= threshold then
      update public.comments set status = 'hidden' where id = new.comment_id and status = 'visible' returning author_id into author;
      if author is not null then
        insert into public.notifications (user_id, kind, data)
        values (author, 'moderation', jsonb_build_object('comment_id', new.comment_id, 'note', 'Your comment was hidden after reports and is being reviewed.'));
      end if;
    end if;
  end if;
  return null;
end $$;

create trigger reports_autohide after insert on public.reports for each row execute function public.on_report();
