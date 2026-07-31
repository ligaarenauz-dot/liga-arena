import {
  ApiError,
  DEFAULT_SEASON,
  cleanText,
  execute,
  inputValue,
  normalizeGame,
  normalizeInteger,
  normalizeLeagueTier,
  normalizeSeason,
  queryAll,
  queryFirst,
  requireDatabase,
} from "./tournament-utils.js";

function normalizePoints(
  value,
  fieldName,
) {
  return normalizeInteger(
    value ?? 0,
    fieldName,
    {
      minimum:
        -999999,

      maximum:
        999999,

      code:
        "INVALID_STANDINGS_VALUE",
    },
  );
}

async function requireApprovedLeagueTeam(
  env,
  teamId,
) {
  const database =
    requireDatabase(env);

  const team =
    await queryFirst(
      database,
      `
        SELECT *
        FROM teams
        WHERE id = ?
        LIMIT 1
      `,
      [
        cleanText(
          teamId,
        ),
      ],
    );

  if (!team) {
    throw new ApiError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  if (
    team.status !==
    "APPROVED"
  ) {
    throw new ApiError(
      "Faqat tasdiqlangan jamoaga natija kiritish mumkin.",
      409,
      "TEAM_NOT_APPROVED",
    );
  }

  if (
    !cleanText(
      team.league_tier,
    )
  ) {
    throw new ApiError(
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
    normalizeInteger(
      inputValue(
        payload,
        "played",
        0,
      ),

      team.game === "PUBG"
        ? "Xaritalar soni"
        : "Seriyalar soni",

      {
        minimum: 0,
        maximum: 999999,
        code:
          "INVALID_STANDINGS_VALUE",
      },
    );

  const wins =
    normalizeInteger(
      inputValue(
        payload,
        "wins",
        0,
      ),

      team.game === "PUBG"
        ? "WWCD"
        : "G‘alabalar",

      {
        minimum: 0,
        maximum: 999999,
        code:
          "INVALID_STANDINGS_VALUE",
      },
    );

  const penaltyPoints =
    normalizeInteger(
      inputValue(
        payload,
        "penaltyPoints",
        0,
      ),
      "Jarima ochkosi",
      {
        minimum: 0,
        maximum: 999999,
        code:
          "INVALID_STANDINGS_VALUE",
      },
    );

  const totalPoints =
    normalizePoints(
      inputValue(
        payload,
        "totalPoints",
        0,
      ),
      "Jami ochko",
    );

  if (wins > played) {
    throw new ApiError(
      team.game === "PUBG"
        ? "WWCD soni o‘ynalgan xaritalardan oshmasligi kerak."
        : "G‘alabalar soni o‘ynalgan seriyalardan oshmasligi kerak.",
      400,
      "INVALID_STANDINGS_TOTAL",
    );
  }

  if (
    team.game ===
    "PUBG"
  ) {
    return {
      played,
      wins,
      losses: 0,
      mapWins: 0,
      mapLosses: 0,

      placementPoints:
        normalizeInteger(
          inputValue(
            payload,
            "placementPoints",
            0,
          ),
          "Joylashuv ochkosi",
          {
            minimum: 0,
            maximum: 999999,
            code:
              "INVALID_STANDINGS_VALUE",
          },
        ),

      eliminationPoints:
        normalizeInteger(
          inputValue(
            payload,
            "eliminationPoints",
            0,
          ),
          "Eliminatsiya ochkosi",
          {
            minimum: 0,
            maximum: 999999,
            code:
              "INVALID_STANDINGS_VALUE",
          },
        ),

      penaltyPoints,
      totalPoints,
    };
  }

  const losses =
    normalizeInteger(
      inputValue(
        payload,
        "losses",
        0,
      ),
      "Mag‘lubiyatlar",
      {
        minimum: 0,
        maximum: 999999,
        code:
          "INVALID_STANDINGS_VALUE",
      },
    );

  if (
    wins + losses >
    played
  ) {
    throw new ApiError(
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
      normalizeInteger(
        inputValue(
          payload,
          "mapWins",
          0,
        ),
        "Yutilgan maplar",
        {
          minimum: 0,
          maximum: 999999,
          code:
            "INVALID_STANDINGS_VALUE",
        },
      ),

    mapLosses:
      normalizeInteger(
        inputValue(
          payload,
          "mapLosses",
          0,
        ),
        "Yutqazilgan maplar",
        {
          minimum: 0,
          maximum: 999999,
          code:
            "INVALID_STANDINGS_VALUE",
        },
      ),

    placementPoints: 0,
    eliminationPoints: 0,
    penaltyPoints,
    totalPoints,
  };
}

export async function listLeagueStandings(
  env,
  source = {},
) {
  const database =
    requireDatabase(env);

  const conditions = [
    "t.status = 'APPROVED'",
    "TRIM(t.league_tier) != ''",
    "t.season = ?",
  ];

  const parameters = [
    normalizeSeason(
      inputValue(
        source,
        "season",
        DEFAULT_SEASON,
      ),
    ),
  ];

  const gameValue =
    inputValue(
      source,
      "game",
      "",
    );

  let game = "";

  if (
    cleanText(
      gameValue,
    )
  ) {
    game =
      normalizeGame(
        gameValue,
        "INVALID_STANDINGS_GAME",
      );

    conditions.push(
      "t.game = ?",
    );

    parameters.push(
      game,
    );
  }

  const leagueValue =
    inputValue(
      source,
      "leagueTier",
      "",
    );

  if (
    cleanText(
      leagueValue,
    )
  ) {
    if (!game) {
      throw new ApiError(
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
        game,
        leagueValue,
        {
          code:
            "INVALID_STANDINGS_LEAGUE",
        },
      ),
    );
  }

  const rows =
    await queryAll(
      database,
      `
        SELECT
          t.id AS teamId,
          t.season,
          t.game,
          t.name AS teamName,
          t.tag,
          t.region,
          t.logo_url AS logoUrl,
          t.league_tier AS leagueTier,

          COALESCE(
            s.played,
            0
          ) AS played,

          COALESCE(
            s.wins,
            0
          ) AS wins,

          COALESCE(
            s.losses,
            0
          ) AS losses,

          COALESCE(
            s.map_wins,
            0
          ) AS mapWins,

          COALESCE(
            s.map_losses,
            0
          ) AS mapLosses,

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

        WHERE ${conditions.join(
          " AND ",
        )}

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
      `,
      parameters,
    );

  return rows.map(
    (
      row,
      index,
    ) => ({
      ...row,
      rank:
        index + 1,
    }),
  );
}

export async function saveTeamStanding(
  env,
  teamId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const team =
    await requireApprovedLeagueTeam(
      env,
      teamId,
    );

  const values =
    normalizeStandingPayload(
      team,
      payload,
    );

  const adminName =
    cleanText(
      inputValue(
        payload,
        "adminName",
        "",
      ),
    ) ||
    "Liga Arena Admin";

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
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
        season =
          excluded.season,

        game =
          excluded.game,

        league_tier =
          excluded.league_tier,

        played =
          excluded.played,

        wins =
          excluded.wins,

        losses =
          excluded.losses,

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
    `,
    [
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
    ],
  );

  return listLeagueStandings(
    env,
    {
      season:
        team.season,

      game:
        team.game,

      leagueTier:
        team.league_tier,
    },
  );
}

export async function resetTeamStanding(
  env,
  teamId,
) {
  const database =
    requireDatabase(env);

  const team =
    await requireApprovedLeagueTeam(
      env,
      teamId,
    );

  await execute(
    database,
    `
      DELETE FROM league_standings
      WHERE team_id = ?
    `,
    [
      cleanText(
        teamId,
      ),
    ],
  );

  return listLeagueStandings(
    env,
    {
      season:
        team.season,

      game:
        team.game,

      leagueTier:
        team.league_tier,
    },
  );
}
