import {
  db,
} from "@liga-arena/database";

import {
  TeamServiceError,
} from "../teams/team.service.js";

const leagueTiers = {
  PUBG: new Set([
    "SOVEREIGN",
    "VANGUARD",
    "ASCENT",
  ]),

  MLBB: new Set([
    "IMPERIUM",
    "ABYSSAL",
    "DAWN",
  ]),
};

function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeGame(value) {
  const game =
    cleanText(value)
      .toUpperCase();

  if (
    !["PUBG", "MLBB"].includes(
      game,
    )
  ) {
    throw new TeamServiceError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_ARCHIVE_GAME",
    );
  }

  return game;
}

function normalizeLeagueTier(
  game,
  value,
) {
  const leagueTier =
    cleanText(value)
      .toUpperCase();

  if (
    !leagueTiers[game]
      ?.has(leagueTier)
  ) {
    throw new TeamServiceError(
      "Liga darajasi noto‘g‘ri.",
      400,
      "INVALID_ARCHIVE_LEAGUE",
    );
  }

  return leagueTier;
}

export function listArchivedSeasons({
  game,
} = {}) {
  const normalizedGame =
    game
      ? normalizeGame(game)
      : "";

  const pubgRows =
    !normalizedGame ||
    normalizedGame === "PUBG"
      ? db
          .prepare(`
            SELECT DISTINCT
              season
            FROM competition_finalizations
            WHERE competition_type = 'QUALIFIER'
            ORDER BY season DESC
          `)
          .all()
          .map(
            (row) => ({
              season: row.season,
              game: "PUBG",
            }),
          )
      : [];

  const mlbbRows =
    !normalizedGame ||
    normalizedGame === "MLBB"
      ? db
          .prepare(`
            SELECT DISTINCT
              season
            FROM mlbb_finalizations
            ORDER BY season DESC
          `)
          .all()
          .map(
            (row) => ({
              season: row.season,
              game: "MLBB",
            }),
          )
      : [];

  const combined = [
    ...pubgRows,
    ...mlbbRows,
  ];

  const map = new Map();

  for (const item of combined) {
    const key =
      `${item.game}:${item.season}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()]
    .sort(
      (left, right) =>
        right.season.localeCompare(
          left.season,
        ),
    );
}

function getPubgArchive({
  season,
  leagueTier,
}) {
  const finalization = db
    .prepare(`
      SELECT
        id,
        season,

        next_season
          AS nextSeason,

        game,

        league_tier
          AS leagueTier,

        team_count
          AS teamCount,

        promote_count
          AS promoteCount,

        relegate_count
          AS relegateCount,

        completed_rounds
          AS completedRounds,

        finalized_by
          AS finalizedBy,

        finalized_at
          AS finalizedAt

      FROM competition_finalizations

      WHERE
        season = ?
        AND game = 'PUBG'
        AND league_tier = ?
        AND competition_type = 'QUALIFIER'
    `)
    .get(
      season,
      leagueTier,
    );

  if (!finalization) {
    return {
      finalization: null,
      standings: [],
    };
  }

  const standings = db
    .prepare(`
      SELECT
        team_id AS teamId,

        rank,
        zone,

        technical_number
          AS technicalNumber,

        team_name
          AS name,

        team_tag
          AS tag,

        region,

        logo_url
          AS logoUrl,

        source_league_tier
          AS sourceLeagueTier,

        target_league_tier
          AS targetLeagueTier,

        played_rounds
          AS playedRounds,

        rest_rounds
          AS restRounds,

        total_kills
          AS totalKills,

        total_points
          AS totalPoints,

        first_places
          AS firstPlaces,

        last_round_points
          AS lastRoundPoints

      FROM competition_final_results

      WHERE finalization_id = ?

      ORDER BY rank ASC
    `)
    .all(finalization.id);

  return {
    finalization,
    standings,
  };
}

function getMlbbArchive({
  season,
  leagueTier,
}) {
  const finalization = db
    .prepare(`
      SELECT
        id,
        season,

        next_season
          AS nextSeason,

        league_tier
          AS leagueTier,

        team_count
          AS teamCount,

        promote_count
          AS promoteCount,

        relegate_count
          AS relegateCount,

        completed_rounds
          AS completedRounds,

        finalized_by
          AS finalizedBy,

        finalized_at
          AS finalizedAt

      FROM mlbb_finalizations

      WHERE
        season = ?
        AND league_tier = ?
    `)
    .get(
      season,
      leagueTier,
    );

  if (!finalization) {
    return {
      finalization: null,
      standings: [],
    };
  }

  const standings = db
    .prepare(`
      SELECT
        team_id AS teamId,

        rank,
        zone,

        technical_number
          AS technicalNumber,

        team_name
          AS name,

        team_tag
          AS tag,

        source_league_tier
          AS sourceLeagueTier,

        target_league_tier
          AS targetLeagueTier,

        played,
        wins,
        losses,

        map_wins
          AS mapWins,

        map_losses
          AS mapLosses,

        map_difference
          AS mapDifference,

        points

      FROM mlbb_final_results

      WHERE finalization_id = ?

      ORDER BY rank ASC
    `)
    .all(finalization.id);

  return {
    finalization,
    standings,
  };
}

export function getArchivedStandings({
  season,
  game,
  leagueTier,
} = {}) {
  const normalizedSeason =
    cleanText(season)
      .toUpperCase();

  if (!normalizedSeason) {
    throw new TeamServiceError(
      "Arxiv mavsumi ko‘rsatilmagan.",
      400,
      "ARCHIVE_SEASON_REQUIRED",
    );
  }

  const normalizedGame =
    normalizeGame(game);

  const normalizedLeagueTier =
    normalizeLeagueTier(
      normalizedGame,
      leagueTier,
    );

  const result =
    normalizedGame === "PUBG"
      ? getPubgArchive({
          season:
            normalizedSeason,

          leagueTier:
            normalizedLeagueTier,
        })
      : getMlbbArchive({
          season:
            normalizedSeason,

          leagueTier:
            normalizedLeagueTier,
        });

  return {
    season:
      normalizedSeason,

    game:
      normalizedGame,

    leagueTier:
      normalizedLeagueTier,

    ...result,
  };
}