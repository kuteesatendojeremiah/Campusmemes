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

-- Starter templates (one blank + 26 classic meme formats), served from /public/templates.
-- Add more in Admin > Templates & stickers.
insert into public.templates (name, image_url) values
  ('Blank (add your own text)', '/templates/blank.png'),
  ('Anakin and Padmé', '/templates/anakin.jpg'),
  ('Ancient Aliens', '/templates/grab.jpg'),
  ('Bad Luck Brian', '/templates/yeeee.jpg'),
  ('Batman Slapping Robin', '/templates/slap.jpg'),
  ('Bernie Asking', '/templates/asking.jpg'),
  ('Change My Mind', '/templates/mind.jpg'),
  ('Confused Kid', '/templates/hoho.jpg'),
  ('Drake Hotline Bling', '/templates/drake.jpg'),
  ('Expanding Brain', '/templates/brain.jpg'),
  ('Grim Reaper Doors', '/templates/devil.jpg'),
  ('Hands Up', '/templates/kutade.jpg'),
  ('Laughing Leo', '/templates/hiiii.jpg'),
  ('Left Exit 12', '/templates/left.jpg'),
  ('Mocking SpongeBob', '/templates/bob.jpg'),
  ('Roll Safe', '/templates/think.jpg'),
  ('Sad Megamind', '/templates/ahhh.jpg'),
  ('Squidward at the Window', '/templates/hmm.jpg'),
  ('Suspicious Fry', '/templates/hmmmmmm.jpg'),
  ('Turner''s Dad Reveal', '/templates/ahh.jpg'),
  ('Two Buttons', '/templates/two-buttons.jpg'),
  ('Uhh Guy', '/templates/more.jpg'),
  ('Unmasking', '/templates/mask.jpg'),
  ('Waiting Pablo', '/templates/pablo.jpg'),
  ('Waiting Skeleton', '/templates/skeleton.jpg'),
  ('Woman Yelling at Cat', '/templates/yelling.jpg'),
  ('You Get a...', '/templates/yee.jpg');

insert into public.challenges (title, description, starts_at, ends_at, prize, sponsor_id)
select 'Dead Semester Week', 'Show us how dead semester really feels. Top 3 get featured on Home.',
       date_trunc('day', now()), date_trunc('day', now()) + interval '7 days',
       'UGX 50,000 airtime (sample prize)', (select id from public.sponsors limit 1);

insert into public.sticker_packs (name) values ('Starter stickers');

insert into public.blocklist (word) values ('exampleblockedword');
