-- Replace the old text-free SVG backgrounds with a blank template and real meme templates.
-- Old rows are deactivated, not deleted, because memes may still reference them.
update public.templates set active = false where image_url like '/templates/%.svg';

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
