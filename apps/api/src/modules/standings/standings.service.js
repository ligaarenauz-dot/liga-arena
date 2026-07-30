import { db } from "@liga-arena/database";

import {
  TeamServiceError,
} from "../teams/team.service.js";

const DEFAULT_SEASON = "S01";

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
  return String(value ?? "").trim();
}

function normalizeGame(value) {
  const game =
    cleanText(value).toUpperCase();

  if (!["PUBG", "MLBB"].includes(game)) {
    throw new TeamServiceError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_STANDINGS_GAME",
    );
  }

  return game;
}

function normalizeLeagueTier(
  game,
  value,
) {
  const leagueTier =
    cleanText(value).toUpperCase();

  if (
    !leagueTiers[game]
      ?.has(leagueTier)
  ) {
    throw new TeamServiceError(
      "Liga darajasi tanlangan o‘yinga mos emas.",
      400,
      "INVALID_STANDINGS_LEAGUE",
    );
  }

  return leagueTier;
}

function normalizeUnsignedInteger(
  value,
  fieldName,
) {
  const number = Number(value ?? 0);

  if (
    !Number.isInteger(number) ||
    number < 0 ||
    number > 999999
  ) {
    throw new TeamServiceError(
      `${fieldName} noto‘g‘ri kiritilgan.`,
      400,
      "INVALID_STANDINGS_VALUE",
    );
  }

  return number;
}

function normalizePoints(
  value,
  fieldName,
) {
  const number = Number(value ?? 0);

  if (
    !Number.isInteger(number) ||
    number < -999999 ||
    number > 999999
  ) {
    throw new TeamServiceError(
      `${fieldName} noto‘g‘ri kiritilgan.`,
      400,
      "INVALID_STANDINGS_VALUE",
    );
  }

  return number;
}

function getRawTeam(teamId) {
  return db
    .prepare(`
      SELECT *
      FROM teams
      WHERE id = ?
    `)
    .get(teamId);
}

function requireApprovedLeagueTeam(
  teamId,
) {
  const team =
    getRawTeam(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  if (team.status !== "APPROVED") {
    throw new TeamServiceError(
      "Faqat tasdiqlangan jamoaga natija kiritish mumkin.",
      409,
      "TEAM_NOT_APPROVED",
    );
  }

  if (!cleanText(team.league_tier)) {
    throw new TeamServiceError(
      "Jamoa hali liga darajasiga biriktirilmagan.",
      409,
      "TEAM_LEAGUE_NOT_ASSIGNED",
    );
  }

  return team;
}

function normalizeStandingPayload(
  team,
  payload = {},
) {
  const played =
    normalizeUnsignedInteger(
      payload.played,
      team.game === "PUBG"
        ? "Xaritalar soni"
        : "Seriyalar soni",
    );

  const wins =
    normalizeUnsignedInteger(
      payload.wins,
      team.game === "PUBG"
        ? "WWCD"
        : "G‘alabalar",
    );

  const penaltyPoints =
    normalizeUnsignedInteger(
      payload.penaltyPoints,
      "Jarima ochkosi",
    );

  const totalPoints =
    normalizePoints(
      payload.totalPoints,
      "Jami ochko",
    );

  if (wins > played) {
    throw new TeamServiceError(
      team.game === "PUBG"
        ? "WWCD soni o‘ynalgan xaritalardan oshmasligi kerak."
        : "G‘alabalar soni o‘ynalgan seriyalardan oshmasligi kerak.",
      400,
      "INVALID_STANDINGS_TOTAL",
    );
  }

  if (team.game === "PUBG") {
    return {
      played,
      wins,
      losses: 0,
      mapWins: 0,
      mapLosses: 0,

      placementPoints:
        normalizeUnsignedInteger(
          payload.placementPoints,
          "Joylashuv ochkosi",
        ),

      eliminationPoints:
        normalizeUnsignedInteger(
          payload.eliminationPoints,
          "Eliminatsiya ochkosi",
        ),

      penaltyPoints,
      totalPoints,
    };
  }

  const losses =
    normalizeUnsignedInteger(
      payload.losses,
      "Mag‘lubiyatlar",
    );

  if (wins + losses > played) {
    throw new TeamServiceError(
      "G‘alaba va mag‘lubiyatlar yig‘indisi seriyalar sonidan oshmasligi kerak.",
      400,
      "INVALID_STANDINGS_TOTAL",
    );
  }

  return {
    played,
    wins,
    losses,

    mapWins:
      normalizeUnsignedInteger(
        payload.mapWins,
        "Yutilgan maplar",
      ),

    mapLosses:
      normalizeUnsignedInteger(
        payload.mapLosses,
        "Yutqazilgan maplar",
      ),

    placementPoints: 0,
    eliminationPoints: 0,
    penaltyPoints,
    totalPoints,
  };
}

export function listLeagueStandings({
  season = DEFAULT_SEASON,
  game,
  leagueTier,
} = {}) {
  const conditions = [
    "t.status = 'APPROVED'",
    "TRIM(t.league_tier) != ''",
    "t.season = ?",
  ];

  const parameters = [
    cleanText(season) ||
      DEFAULT_SEASON,
  ];

  let normalizedGame = "";

  if (game) {
    normalizedGame =
      normalizeGame(game);

    conditions.push("t.game = ?");
    parameters.push(normalizedGame);
  }

  if (leagueTier) {
    if (!normalizedGame) {
      throw new TeamServiceError(
        "Liga bo‘yicha filtrlash uchun o‘yin turini ham tanlang.",
        400,
        "STANDINGS_GAME_REQUIRED",
      );
    }

    conditions.push(
      "t.league_tier = ?",
    );

    parameters.push(
      normalizeLeagueTier(
        normalizedGame,
        leagueTier,
      ),
    );
  }

  const rows = db
    .prepare(`
      SELECT
        t.id AS teamId,
        t.season,
        t.game,
        t.name AS teamName,
        t.tag,
        t.region,
        t.logo_url AS logoUrl,
        t.league_tier AS leagueTier,

        COALESCE(s.played, 0)
          AS played,

        COALESCE(s.wins, 0)
          AS wins,

        COALESCE(s.losses, 0)
          AS losses,

        COALESCE(s.map_wins, 0)
          AS mapWins,

        COALESCE(s.map_losses, 0)
          AS mapLosses,

        COALESCE(
          s.placement_points,
          0
        ) AS placementPoints,

        COALESCE(
          s.elimination_points,
          0
        ) AS eliminationPoints,

        COALESCE(
          s.penalty_points,
          0
        ) AS penaltyPoints,

        COALESCE(
          s.total_points,
          0
        ) AS totalPoints,

        COALESCE(
          s.updated_by,
          ''
        ) AS updatedBy,

        COALESCE(
          s.updated_at,
          ''
        ) AS updatedAt

      FROM teams t

      LEFT JOIN league_standings s
        ON s.team_id = t.id

      WHERE ${conditions.join(" AND ")}

      ORDER BY
        COALESCE(
          s.total_points,
          0
        ) DESC,

        COALESCE(
          s.wins,
          0
        ) DESC,

        CASE
          WHEN t.game = 'PUBG'
            THEN COALESCE(
              s.elimination_points,
              0
            )

          ELSE
            COALESCE(
              s.map_wins,
              0
            ) -
            COALESCE(
              s.map_losses,
              0
            )
        END DESC,

        t.name ASC
    `)
    .all(...parameters);

  return rows.map(
    (row, index) => ({
      ...row,
      rank: index + 1,
    }),
  );
}

export function saveTeamStanding(
  teamId,
  payload = {},
) {
  const team =
    requireApprovedLeagueTeam(
      teamId,
    );

  const values =
    normalizeStandingPayload(
      team,
      payload,
    );

  const adminName =
    cleanText(payload.adminName) ||
    "Liga Arena Admin";

  const now =
    new Date().toISOString();

  db.prepare(`
    INSERT INTO league_standings (
      team_id,
      season,
      game,
      league_tier,
      played,
      wins,
      losses,
      map_wins,
      map_losses,
      placement_points,
      elimination_points,
      penalty_points,
      total_points,
      updated_by,
      created_at,
      updated_at
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )

    ON CONFLICT(team_id)
    DO UPDATE SET
      season = excluded.season,
      game = excluded.game,
      league_tier =
        excluded.league_tier,

      played = excluded.played,
      wins = excluded.wins,
      losses = excluded.losses,

      map_wins =
        excluded.map_wins,

      map_losses =
        excluded.map_losses,

      placement_points =
        excluded.placement_points,

      elimination_points =
        excluded.elimination_points,

      penalty_points =
        excluded.penalty_points,

      total_points =
        excluded.total_points,

      updated_by =
        excluded.updated_by,

      updated_at =
        excluded.updated_at
  `).run(
    team.id,
    team.season,
    team.game,
    team.league_tier,
    values.played,
    values.wins,
    values.losses,
    values.mapWins,
    values.mapLosses,
    values.placementPoints,
    values.eliminationPoints,
    values.penaltyPoints,
    values.totalPoints,
    adminName,
    now,
    now,
  );

  return listLeagueStandings({
    season: team.season,
    game: team.game,
    leagueTier:
      team.league_tier,
  });
}

export function resetTeamStanding(
  teamId,
) {
  const team =
    requireApprovedLeagueTeam(
      teamId,
    );

  db.prepare(`
    DELETE FROM league_standings
    WHERE team_id = ?
  `).run(teamId);

  return listLeagueStandings({
    season: team.season,
    game: team.game,
    leagueTier:
      team.league_tier,
  });
}