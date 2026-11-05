-- Sample data so every screen can be tested.

insert into public.topics (slug, name, description, emoji) values
  ('exams', 'Exams & Coursework', 'Retakes, dead semester, group work, the "this won''t come out" promise', '📚'),
  ('hostel', 'Hostel Life', 'Roommates, power cuts, water shortages, hostel food', '🏠'),
  ('broke', 'Broke Student Life', 'Fees, upkeep, the end-of-month rolex economy', '💸'),
  ('crushes', 'Crushes & Relationships', 'Situationships, Valentine''s, couples', '💘'),
  ('lectures', 'Lecture Moments', 'General classroom situations only, never a named or recognisable lecturer', '🎓'),
  ('events', 'Events & Weekends', 'Freshers'' week, guild elections, sports, parties', '🎉');

insert into public.sponsors (name, link_url, category) values
  ('Sample Rolex Stand (placeholder sponsor)', 'https://example.com', 'food');

-- 20 text-free starter backgrounds (solid / gradient / stripes / dots in 5 colours), served from /public/templates.
-- Replace or add real meme templates in Admin > Templates & stickers.
insert into public.templates (name, image_url)
select initcap(c) || ' ' || s, '/templates/' || c || '-' || s || '.svg'
from unnest(array['purple','yellow','green','orange','blue']) c, unnest(array['solid','gradient','stripes','dots']) s;

insert into public.challenges (title, description, starts_at, ends_at, prize, sponsor_id)
select 'Dead Semester Week', 'Show us how dead semester really feels. Top 3 get featured on Home.',
       date_trunc('day', now()), date_trunc('day', now()) + interval '7 days',
       'UGX 50,000 airtime (sample prize)', (select id from public.sponsors limit 1);

insert into public.sticker_packs (name) values ('Starter stickers');

insert into public.blocklist (word) values ('exampleblockedword');
