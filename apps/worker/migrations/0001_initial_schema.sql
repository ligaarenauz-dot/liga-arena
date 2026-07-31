-- Liga Arena D1 initial schema
-- Generated from local SQLite schema.
-- Faqat schema ko'chiriladi; lokal jamoa va test ma'lumotlari ko'chirilmaydi.

PRAGMA defer_foreign_keys = true;

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    season TEXT NOT NULL,
    game TEXT NOT NULL CHECK (game IN ('PUBG', 'MLBB')),
    name TEXT NOT NULL COLLATE NOCASE,
    tag TEXT NOT NULL COLLATE NOCASE,
    region TEXT NOT NULL DEFAULT 'Toshkent shahri',
    logo_url TEXT NOT NULL DEFAULT '',
    captain_telegram_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (
        status IN (
          'DRAFT',
          'PENDING_CONFIRMATION',
          'PENDING_REVIEW',
          'APPROVED',
          'REJECTED',
          'LOCKED'
        )
      ),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, media_consent INTEGER NOT NULL DEFAULT 0, rules_consent INTEGER NOT NULL DEFAULT 0, consented_at TEXT NOT NULL DEFAULT '', rules_version TEXT NOT NULL DEFAULT '2026.1', media_policy_version TEXT NOT NULL DEFAULT '2026.1', consent_telegram_id TEXT NOT NULL DEFAULT '', league_tier TEXT NOT NULL DEFAULT '', league_assigned_at TEXT NOT NULL DEFAULT '', league_assigned_by TEXT NOT NULL DEFAULT '', technical_number TEXT NOT NULL DEFAULT '', next_league_tier TEXT NOT NULL DEFAULT '', next_season TEXT NOT NULL DEFAULT '',

    UNIQUE (season, game, name),
    UNIQUE (season, game, tag)
  ) STRICT;

CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    season TEXT NOT NULL,
    game TEXT NOT NULL CHECK (game IN ('PUBG', 'MLBB')),
    telegram_id TEXT,
    first_name TEXT,
    username TEXT,
    game_user_id TEXT NOT NULL,
    server_id TEXT NOT NULL DEFAULT '',
    nickname TEXT NOT NULL,
    role TEXT NOT NULL
      CHECK (role IN ('CAPTAIN', 'MAIN', 'RESERVE')),
    confirmation_status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (
        confirmation_status IN (
          'PENDING',
          'CONFIRMED',
          'REJECTED'
        )
      ),
    created_at TEXT NOT NULL, full_name TEXT NOT NULL DEFAULT '', birth_date TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE,

    UNIQUE (season, game, game_user_id, server_id),
    UNIQUE (season, game, telegram_id)
  ) STRICT;

CREATE TABLE IF NOT EXISTS member_invites (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    member_id TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (
        status IN (
          'PENDING',
          'CONFIRMED',
          'REJECTED',
          'EXPIRED'
        )
      ),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE,

    FOREIGN KEY (member_id)
      REFERENCES team_members(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS team_reviews (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    decision TEXT NOT NULL
      CHECK (decision IN ('APPROVED', 'REJECTED')),
    reason TEXT NOT NULL DEFAULT '',
    admin_name TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    created_at TEXT NOT NULL,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS member_eligibility (
    member_id TEXT PRIMARY KEY,
    birth_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (member_id)
      REFERENCES team_members(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS schedule_events (
    id TEXT PRIMARY KEY,

    season TEXT NOT NULL DEFAULT 'S01',

    game TEXT NOT NULL
      CHECK (game IN ('PUBG', 'MLBB')),

    league_tier TEXT NOT NULL DEFAULT '',

    event_type TEXT NOT NULL
      CHECK (
        event_type IN (
          'QUALIFIER',
          'LEAGUE',
          'PLAYOFF',
          'FINAL',
          'SHOWMATCH'
        )
      ),

    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT '',
    scheduled_at TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'SCHEDULED'
      CHECK (
        status IN (
          'SCHEDULED',
          'LIVE',
          'FINISHED',
          'POSTPONED',
          'CANCELLED'
        )
      ),

    format TEXT NOT NULL DEFAULT '',
    stream_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

CREATE TABLE IF NOT EXISTS league_standings (
    team_id TEXT PRIMARY KEY,

    season TEXT NOT NULL,
    game TEXT NOT NULL
      CHECK (game IN ('PUBG', 'MLBB')),

    league_tier TEXT NOT NULL,

    played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,

    map_wins INTEGER NOT NULL DEFAULT 0,
    map_losses INTEGER NOT NULL DEFAULT 0,

    placement_points INTEGER NOT NULL DEFAULT 0,
    elimination_points INTEGER NOT NULL DEFAULT 0,

    penalty_points INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,

    updated_by TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS team_number_sequences (
    season TEXT NOT NULL,
    game TEXT NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (
      season,
      game
    )
  ) STRICT;

CREATE TABLE IF NOT EXISTS competition_settings (
    season TEXT NOT NULL,
    game TEXT NOT NULL,
    league_tier TEXT NOT NULL,
    competition_type TEXT NOT NULL,

    active_teams_per_round INTEGER NOT NULL DEFAULT 25,
    maps_per_round INTEGER NOT NULL DEFAULT 4,

    promote_count INTEGER NOT NULL DEFAULT 25,
    relegate_count INTEGER NOT NULL DEFAULT 25,

    updated_by TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    updated_at TEXT NOT NULL,

    PRIMARY KEY (
      season,
      game,
      league_tier,
      competition_type
    )
  ) STRICT;

CREATE TABLE IF NOT EXISTS competition_rounds (
    id TEXT PRIMARY KEY,

    season TEXT NOT NULL,
    game TEXT NOT NULL,
    league_tier TEXT NOT NULL,

    competition_type TEXT NOT NULL
      CHECK (
        competition_type IN (
          'QUALIFIER',
          'LEAGUE'
        )
      ),

    round_number INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (
        status IN (
          'DRAFT',
          'OPEN',
          'COMPLETED'
        )
      ),

    maps_per_round INTEGER NOT NULL DEFAULT 4,

    created_by TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    created_at TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,

    UNIQUE (
      season,
      game,
      league_tier,
      competition_type,
      round_number
    )
  ) STRICT;

CREATE TABLE IF NOT EXISTS competition_round_teams (
    round_id TEXT NOT NULL,
    team_id TEXT NOT NULL,

    participation TEXT NOT NULL
      CHECK (
        participation IN (
          'PLAY',
          'REST'
        )
      ),

    created_at TEXT NOT NULL,

    PRIMARY KEY (
      round_id,
      team_id
    ),

    FOREIGN KEY (round_id)
      REFERENCES competition_rounds(id)
      ON DELETE CASCADE,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS competition_map_results (
    round_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    map_number INTEGER NOT NULL,

    placement INTEGER NOT NULL,
    kills INTEGER NOT NULL DEFAULT 0,

    placement_points INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    PRIMARY KEY (
      round_id,
      team_id,
      map_number
    ),

    FOREIGN KEY (round_id)
      REFERENCES competition_rounds(id)
      ON DELETE CASCADE,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS competition_finalizations (
      id TEXT PRIMARY KEY,

      season TEXT NOT NULL,
      next_season TEXT NOT NULL,

      game TEXT NOT NULL,
      league_tier TEXT NOT NULL,

      competition_type TEXT NOT NULL,

      team_count INTEGER NOT NULL,
      promote_count INTEGER NOT NULL,
      relegate_count INTEGER NOT NULL,
      completed_rounds INTEGER NOT NULL,

      finalized_by TEXT NOT NULL,
      finalized_at TEXT NOT NULL,

      UNIQUE (
        season,
        game,
        league_tier,
        competition_type
      )
    ) STRICT;

CREATE TABLE IF NOT EXISTS competition_final_results (
      finalization_id TEXT NOT NULL,
      team_id TEXT NOT NULL,

      rank INTEGER NOT NULL,
      zone TEXT NOT NULL,

      source_league_tier TEXT NOT NULL,
      target_league_tier TEXT NOT NULL,

      technical_number TEXT NOT NULL,
      team_name TEXT NOT NULL,
      team_tag TEXT NOT NULL,
      region TEXT NOT NULL,
      logo_url TEXT NOT NULL DEFAULT '',

      played_rounds INTEGER NOT NULL,
      rest_rounds INTEGER NOT NULL,

      total_kills INTEGER NOT NULL,
      total_points INTEGER NOT NULL,

      first_places INTEGER NOT NULL,
      last_round_points INTEGER NOT NULL,

      PRIMARY KEY (
        finalization_id,
        team_id
      ),

      FOREIGN KEY (finalization_id)
        REFERENCES competition_finalizations(id)
        ON DELETE CASCADE,

      FOREIGN KEY (team_id)
        REFERENCES teams(id)
        ON DELETE CASCADE
    ) STRICT;

CREATE TABLE IF NOT EXISTS season_rollovers (
    id TEXT PRIMARY KEY,

    source_season TEXT NOT NULL UNIQUE,
    target_season TEXT NOT NULL,

    team_count INTEGER NOT NULL,

    promoted_count INTEGER NOT NULL DEFAULT 0,
    stayed_count INTEGER NOT NULL DEFAULT 0,
    relegated_count INTEGER NOT NULL DEFAULT 0,

    activated_by TEXT NOT NULL,
    activated_at TEXT NOT NULL
  ) STRICT;

CREATE TABLE IF NOT EXISTS season_rollover_teams (
    rollover_id TEXT NOT NULL,
    team_id TEXT NOT NULL,

    technical_number TEXT NOT NULL,
    game TEXT NOT NULL,

    team_name TEXT NOT NULL,
    team_tag TEXT NOT NULL,

    source_league_tier TEXT NOT NULL,
    target_league_tier TEXT NOT NULL,

    movement TEXT NOT NULL
      CHECK (
        movement IN (
          'PROMOTED',
          'STAYED',
          'RELEGATED'
        )
      ),

    PRIMARY KEY (
      rollover_id,
      team_id
    ),

    FOREIGN KEY (rollover_id)
      REFERENCES season_rollovers(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_settings (
    season TEXT NOT NULL,
    league_tier TEXT NOT NULL,

    best_of INTEGER NOT NULL DEFAULT 3,
    win_points INTEGER NOT NULL DEFAULT 3,
    loss_points INTEGER NOT NULL DEFAULT 0,

    updated_by TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    updated_at TEXT NOT NULL, promote_count INTEGER NOT NULL DEFAULT 25, relegate_count INTEGER NOT NULL DEFAULT 25,

    PRIMARY KEY (
      season,
      league_tier
    )
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_league_roster (
    season TEXT NOT NULL,
    league_tier TEXT NOT NULL,
    team_id TEXT NOT NULL,
    seed_order INTEGER NOT NULL,

    created_at TEXT NOT NULL,

    PRIMARY KEY (
      season,
      league_tier,
      team_id
    ),

    UNIQUE (
      season,
      league_tier,
      seed_order
    ),

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_rounds (
    id TEXT PRIMARY KEY,

    season TEXT NOT NULL,
    league_tier TEXT NOT NULL,

    round_number INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (
        status IN (
          'DRAFT',
          'OPEN',
          'COMPLETED'
        )
      ),

    best_of INTEGER NOT NULL DEFAULT 3,

    created_by TEXT NOT NULL DEFAULT 'Liga Arena Admin',
    created_at TEXT NOT NULL,
    completed_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,

    UNIQUE (
      season,
      league_tier,
      round_number
    )
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_matches (
    id TEXT PRIMARY KEY,

    round_id TEXT NOT NULL,

    team_a_id TEXT NOT NULL,
    team_b_id TEXT NOT NULL,

    score_a INTEGER,
    score_b INTEGER,

    winner_team_id TEXT,

    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (
        status IN (
          'PENDING',
          'COMPLETED'
        )
      ),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE (
      round_id,
      team_a_id,
      team_b_id
    ),

    FOREIGN KEY (round_id)
      REFERENCES mlbb_rounds(id)
      ON DELETE CASCADE,

    FOREIGN KEY (team_a_id)
      REFERENCES teams(id)
      ON DELETE CASCADE,

    FOREIGN KEY (team_b_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_round_byes (
    round_id TEXT NOT NULL,
    team_id TEXT NOT NULL,

    created_at TEXT NOT NULL,

    PRIMARY KEY (
      round_id,
      team_id
    ),

    FOREIGN KEY (round_id)
      REFERENCES mlbb_rounds(id)
      ON DELETE CASCADE,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_finalizations (
    id TEXT PRIMARY KEY,

    season TEXT NOT NULL,
    next_season TEXT NOT NULL,

    league_tier TEXT NOT NULL,

    team_count INTEGER NOT NULL,

    promote_count INTEGER NOT NULL,
    relegate_count INTEGER NOT NULL,

    completed_rounds INTEGER NOT NULL,

    finalized_by TEXT NOT NULL,
    finalized_at TEXT NOT NULL,

    UNIQUE (
      season,
      league_tier
    )
  ) STRICT;

CREATE TABLE IF NOT EXISTS mlbb_final_results (
    finalization_id TEXT NOT NULL,
    team_id TEXT NOT NULL,

    rank INTEGER NOT NULL,
    zone TEXT NOT NULL,

    source_league_tier TEXT NOT NULL,
    target_league_tier TEXT NOT NULL,

    technical_number TEXT NOT NULL,

    team_name TEXT NOT NULL,
    team_tag TEXT NOT NULL,

    played INTEGER NOT NULL,
    wins INTEGER NOT NULL,
    losses INTEGER NOT NULL,

    map_wins INTEGER NOT NULL,
    map_losses INTEGER NOT NULL,
    map_difference INTEGER NOT NULL,

    points INTEGER NOT NULL,

    PRIMARY KEY (
      finalization_id,
      team_id
    ),

    FOREIGN KEY (finalization_id)
      REFERENCES mlbb_finalizations(id)
      ON DELETE CASCADE,

    FOREIGN KEY (team_id)
      REFERENCES teams(id)
      ON DELETE CASCADE
  ) STRICT;

CREATE TABLE IF NOT EXISTS round_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    game TEXT NOT NULL
      CHECK (
        game IN (
          'PUBG',
          'MLBB'
        )
      ),

    round_id TEXT NOT NULL,
    team_id TEXT NOT NULL,

    telegram_id TEXT NOT NULL DEFAULT '',

    notification_type TEXT NOT NULL,

    status TEXT NOT NULL
      CHECK (
        status IN (
          'SENT',
          'FAILED',
          'SKIPPED'
        )
      ),

    telegram_message_id TEXT NOT NULL DEFAULT '',
    error_text TEXT NOT NULL DEFAULT '',

    attempt_count INTEGER NOT NULL DEFAULT 1,

    sent_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE (
      game,
      round_id,
      team_id
    )
  ) STRICT;

CREATE INDEX IF NOT EXISTS idx_teams_game_season
    ON teams(game, season);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id
    ON team_members(team_id);

CREATE INDEX IF NOT EXISTS idx_team_members_game_user
    ON team_members(game, game_user_id, server_id);

CREATE INDEX IF NOT EXISTS idx_member_invites_token
    ON member_invites(token);

CREATE INDEX IF NOT EXISTS idx_member_invites_team
    ON member_invites(team_id);

CREATE INDEX IF NOT EXISTS idx_team_reviews_team_id
    ON team_reviews(team_id);

CREATE INDEX IF NOT EXISTS idx_team_reviews_created_at
    ON team_reviews(created_at);

CREATE INDEX IF NOT EXISTS idx_member_eligibility_birth_date
    ON member_eligibility(birth_date);

CREATE INDEX IF NOT EXISTS idx_schedule_events_date
    ON schedule_events(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_schedule_events_game
    ON schedule_events(game, season);

CREATE INDEX IF NOT EXISTS idx_schedule_events_league
    ON schedule_events(game, league_tier);

CREATE INDEX IF NOT EXISTS idx_schedule_events_status
    ON schedule_events(status);

CREATE INDEX IF NOT EXISTS idx_league_standings_group
    ON league_standings(
      season,
      game,
      league_tier
    );

CREATE INDEX IF NOT EXISTS idx_league_standings_points
    ON league_standings(
      total_points DESC
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_technical_number

  ON teams(technical_number)

  WHERE technical_number != '';

CREATE INDEX IF NOT EXISTS idx_competition_rounds_division

  ON competition_rounds(
    season,
    game,
    league_tier,
    competition_type,
    round_number
  );

CREATE INDEX IF NOT EXISTS idx_competition_round_teams_team

  ON competition_round_teams(
    team_id,
    participation
  );

CREATE INDEX IF NOT EXISTS idx_competition_results_team

  ON competition_map_results(
    team_id,
    round_id
  );

CREATE INDEX IF NOT EXISTS idx_competition_finalizations_division

  ON competition_finalizations(
    season,
    game,
    league_tier,
    competition_type
  );

CREATE INDEX IF NOT EXISTS idx_competition_final_results_rank

  ON competition_final_results(
    finalization_id,
    rank
  );

CREATE INDEX IF NOT EXISTS idx_season_rollover_teams_movement

  ON season_rollover_teams(
    rollover_id,
    movement
  );

CREATE INDEX IF NOT EXISTS idx_mlbb_rounds_league
    ON mlbb_rounds(
      season,
      league_tier,
      round_number
    );

CREATE INDEX IF NOT EXISTS idx_mlbb_matches_round
    ON mlbb_matches(round_id);

CREATE INDEX IF NOT EXISTS idx_mlbb_matches_teams
    ON mlbb_matches(
      team_a_id,
      team_b_id
    );

CREATE INDEX IF NOT EXISTS idx_mlbb_final_results_rank

  ON mlbb_final_results(
    finalization_id,
    rank
  );

CREATE INDEX IF NOT EXISTS idx_round_notifications_round

  ON round_notifications(
    game,
    round_id,
    status
  );

CREATE INDEX IF NOT EXISTS idx_competition_finalizations_lookup

  ON competition_finalizations(
    season,
    game,
    league_tier,
    competition_type
  );

INSERT OR IGNORE INTO system_settings (
  key,
  value,
  updated_at
)
VALUES (
  'active_season',
  'S01',
  CURRENT_TIMESTAMP
);
