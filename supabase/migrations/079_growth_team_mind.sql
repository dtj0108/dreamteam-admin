-- Migration: Add existing mind content to Growth Team
-- Link all enabled mind files to the Growth Team

INSERT INTO team_mind (team_id, mind_id, position_override)
SELECT
  t.id as team_id,
  m.id as mind_id,
  m.position as position_override
FROM agent_mind m
CROSS JOIN teams t
WHERE t.slug = 'growth'
  AND m.is_enabled = true
ON CONFLICT (team_id, mind_id) DO NOTHING;
