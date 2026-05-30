
-- Assign a distinct ElevenLabs voice to each agent based on persona
UPDATE public.jwba_agents SET spec = spec || jsonb_build_object('voice_id', v.voice_id, 'voice_name', v.voice_name)
FROM (VALUES
  ('optimus',  'kAIWans22T8FUotYdyIM', 'Optimus (cloned)'),
  ('athena',   'cgSgspJ2msm6clMCkdW9', 'Jessica'),
  ('cipher',   'nPczCjzI2devNBz1zQrb', 'Brian'),
  ('nova',     'EXAVITQu4vr4xnSDxMaL', 'Sarah'),
  ('atlas',    'JBFqnCBsd6RMkjVDRZzb', 'George'),
  ('victoria', 'Xb7hH8MSUJpSbSDYk0k2', 'Alice'),
  ('sentinel', 'onwK4e9ZLuTAKqWW03F9', 'Daniel'),
  ('aaron',    'cjVigY5qzO86Huf0OWal', 'Eric'),
  ('mark',     'bIHbv24MWmeRgasZH58o', 'Will'),
  ('cody',     'TX3LPaxmHKxFdv7VOQHJ', 'Liam'),
  ('patty',    'XrExE9yKIg1WjnnlVkGX', 'Matilda'),
  ('vicky',    'FGY2WhTYpPnrIDTdsKH5', 'Laura'),
  ('jerry',    'CwhRBWXzGAHq8TQ4Fs17', 'Roger'),
  ('dolly',    'pFZP5JQG7iQjIQuC4Bku', 'Lily'),
  ('maya',     'SAz9YHcvj6GT2YYXdXww', 'River'),
  ('angelina', 'IKne3meq5aSn9XLyUdCD', 'Charlie'),
  ('frannie',  'pqHfZKP75CvOlQylNhV4', 'Bill')
) AS v(codename, voice_id, voice_name)
WHERE jwba_agents.codename = v.codename;
