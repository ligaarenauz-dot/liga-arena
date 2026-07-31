-- Liga Arena D1 technical-number trigger test
-- Faqat local D1 bazada bajarilsin.

DELETE FROM teams WHERE id = 'd1-trigger-test-08504811';

INSERT INTO teams (
  "id",
  "season",
  "game",
  "name",
  "tag",
  "region",
  "logo_url",
  "captain_telegram_id",
  "status",
  "created_at",
  "updated_at",
  "media_consent",
  "rules_consent",
  "consented_at",
  "rules_version",
  "media_policy_version",
  "consent_telegram_id",
  "league_tier",
  "league_assigned_at",
  "league_assigned_by",
  "technical_number",
  "next_league_tier",
  "next_season"
)
VALUES (
  'd1-trigger-test-08504811',
  'S01',
  'PUBG',
  'D1 Trigger Test 08504811-08504811',
  'D1T4811',
  'Buxoro viloyati',
  '/uploads/team-logos/9605f558-fc98-4603-9518-ca3e6570068a.jpg',
  '99908504811',
  'APPROVED',
  '2026-07-31T14:35:04.811Z',
  '2026-07-31T14:35:04.811Z',
  1,
  1,
  '2026-07-26T11:48:51.996Z',
  '2026.1',
  '2026.1',
  '6549872',
  'ASCENT',
  '2026-07-26T14:00:03.969Z',
  'Liga Arena Admin',
  '',
  '',
  ''
);

SELECT
  id,
  game,
  season,
  name,
  tag,
  technical_number
FROM teams
WHERE id = 'd1-trigger-test-08504811';
