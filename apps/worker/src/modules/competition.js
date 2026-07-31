import {
  ApiError,
  DEFAULT_SEASON,
  cleanText,
  execute,
  executeBatch,
  getNextSeason,
  inputValue,
  makeStatement,
  normalizeGame,
  normalizeInteger,
  normalizeLeagueTier,
  normalizeSeason,
  queryAll,
  queryFirst,
  randomId,
  requireDatabase,
  technicalOrder,
} from "./tournament-utils.js";

const DEFAULT_ACTIVE_TEAMS =
  25;

const DEFAULT_MAPS_PER_ROUND =
  4;

const DEFAULT_PROMOTE_COUNT =
  25;

const DEFAULT_RELEGATE_COUNT =
  25;

const placementPoints = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
};

const pubgLeagueOrder = [
  "SOVEREIGN",
  "VANGUARD",
  "ASCENT",
];

function chunkArray(
  values,
  size,
) {
  const chunks = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
}

function normalizeCompetitionType(
  value,
) {
  const competitionType =
    cleanText(
      value ||
      "QUALIFIER",
    ).toUpperCase();

  if (
    competitionType !==
      "QUALIFIER" &&
    competitionType !==
      "LEAGUE"
  ) {
    throw new ApiError(
      "Musobaqa turi noto‘g‘ri.",
      400,
      "INVALID_COMPETITION_TYPE",
    );
  }

  return competitionType;
}

function normalizeDivision(
  source = {},
) {
  const game =
    normalizeGame(
      inputValue(
        source,
        "game",
        "PUBG",
      ),
      "INVALID_COMPETITION_GAME",
    );

  return {
    season:
      normalizeSeason(
        inputValue(
          source,
          "season",
          DEFAULT_SEASON,
        ),
      ),

    game,

    leagueTier:
      normalizeLeagueTier(
        game,
        inputValue(
          source,
          "leagueTier",
          game === "PUBG"
            ? "ASCENT"
            : "DAWN",
        ),
        {
          code:
            "INVALID_COMPETITION_LEAGUE",
        },
      ),

    competitionType:
      normalizeCompetitionType(
        inputValue(
          source,
          "competitionType",
          "QUALIFIER",
        ),
      ),
  };
}

function calculatePlacementPoints(
  placement,
) {
  return Number(
    placementPoints[
      placement
    ] ||
    0,
  );
}

async function getDivisionTeams(
  env,
  division,
) {
  const database =
    requireDatabase(env);

  return queryAll(
    database,
    `
      SELECT
        id,

        technical_number
          AS technicalNumber,

        name,
        tag,
        region,
        logo_url AS logoUrl,
        league_tier AS leagueTier

      FROM teams

      WHERE
        season = ?
        AND game = ?
        AND league_tier = ?
        AND status = 'APPROVED'

      ORDER BY
        technical_number ASC,
        name ASC
    `,
    [
      division.season,
      division.game,
      division.leagueTier,
    ],
  );
}

async function ensureSettings(
  env,
  division,
) {
  const database =
    requireDatabase(env);

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
      INSERT OR IGNORE INTO competition_settings (
        season,
        game,
        league_tier,
        competition_type,
        active_teams_per_round,
        maps_per_round,
        promote_count,
        relegate_count,
        updated_by,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        'Liga Arena Admin',
        ?
      )
    `,
    [
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
      DEFAULT_ACTIVE_TEAMS,
      DEFAULT_MAPS_PER_ROUND,
      DEFAULT_PROMOTE_COUNT,
      DEFAULT_RELEGATE_COUNT,
      now,
    ],
  );

  return queryFirst(
    database,
    `
      SELECT
        season,
        game,
        league_tier AS leagueTier,
        competition_type AS competitionType,
        active_teams_per_round AS activeTeamsPerRound,
        maps_per_round AS mapsPerRound,
        promote_count AS promoteCount,
        relegate_count AS relegateCount,
        updated_by AS updatedBy,
        updated_at AS updatedAt

      FROM competition_settings

      WHERE
        season = ?
        AND game = ?
        AND league_tier = ?
        AND competition_type = ?

      LIMIT 1
    `,
    [
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    ],
  );
}

export async function saveCompetitionSettings(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const division =
    normalizeDivision(
      payload,
    );

  const activeTeamsPerRound =
    normalizeInteger(
      inputValue(
        payload,
        "activeTeamsPerRound",
        DEFAULT_ACTIVE_TEAMS,
      ),
      "Bir turda o‘ynaydigan jamoalar soni",
      {
        minimum: 1,
        maximum: 100,
        code:
          "INVALID_COMPETITION_NUMBER",
      },
    );

  const promoteCount =
    normalizeInteger(
      inputValue(
        payload,
        "promoteCount",
        DEFAULT_PROMOTE_COUNT,
      ),
      "Yuqoriga o‘tadigan jamoalar soni",
      {
        minimum: 0,
        maximum: 100,
        code:
          "INVALID_COMPETITION_NUMBER",
      },
    );

  const relegateCount =
    normalizeInteger(
      inputValue(
        payload,
        "relegateCount",
        DEFAULT_RELEGATE_COUNT,
      ),
      "Quyiga tushadigan jamoalar soni",
      {
        minimum: 0,
        maximum: 100,
        code:
          "INVALID_COMPETITION_NUMBER",
      },
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
      INSERT INTO competition_settings (
        season,
        game,
        league_tier,
        competition_type,
        active_teams_per_round,
        maps_per_round,
        promote_count,
        relegate_count,
        updated_by,
        updated_at
      )

      VALUES (
        ?, ?, ?, ?,
        ?, 4, ?, ?, ?, ?
      )

      ON CONFLICT (
        season,
        game,
        league_tier,
        competition_type
      )

      DO UPDATE SET
        active_teams_per_round =
          excluded.active_teams_per_round,

        maps_per_round = 4,

        promote_count =
          excluded.promote_count,

        relegate_count =
          excluded.relegate_count,

        updated_by =
          excluded.updated_by,

        updated_at =
          excluded.updated_at
    `,
    [
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
      activeTeamsPerRound,
      promoteCount,
      relegateCount,
      adminName,
      now,
    ],
  );

  return ensureSettings(
    env,
    division,
  );
}

async function getRoundHistory(
  env,
  division,
) {
  const database =
    requireDatabase(env);

  const rows =
    await queryAll(
      database,
      `
        SELECT
          rt.team_id AS teamId,
          rt.participation,
          r.round_number AS roundNumber

        FROM competition_round_teams rt

        INNER JOIN competition_rounds r
          ON r.id = rt.round_id

        WHERE
          r.season = ?
          AND r.game = ?
          AND r.league_tier = ?
          AND r.competition_type = ?
      `,
      [
        division.season,
        division.game,
        division.leagueTier,
        division.competitionType,
      ],
    );

  const history =
    new Map();

  for (
    const row of
    rows
  ) {
    const current =
      history.get(
        row.teamId,
      ) || {
        playCount: 0,
        restCount: 0,
        lastRestRound: 0,
      };

    if (
      row.participation ===
      "REST"
    ) {
      current.restCount +=
        1;

      current.lastRestRound =
        Math.max(
          current.lastRestRound,
          Number(
            row.roundNumber ||
            0,
          ),
        );
    } else {
      current.playCount +=
        1;
    }

    history.set(
      row.teamId,
      current,
    );
  }

  return history;
}

function chooseRestTeams({
  teams,
  history,
  restCount,
  roundNumber,
}) {
  if (
    restCount <= 0
  ) {
    return new Set();
  }

  const teamCount =
    teams.length;

  const rotationOffset =
    (
      (
        roundNumber -
        1
      ) *
      Math.max(
        restCount,
        1,
      )
    ) %
    Math.max(
      teamCount,
      1,
    );

  const candidates =
    teams.map(
      (team) => {
        const teamHistory =
          history.get(
            team.id,
          ) || {
            playCount: 0,
            restCount: 0,
            lastRestRound: 0,
          };

        const technicalIndex =
          technicalOrder(
            team.technicalNumber,
          );

        const rotationOrder =
          (
            technicalIndex -
            rotationOffset +
            teamCount * 1000
          ) %
          Math.max(
            teamCount,
            1,
          );

        return {
          ...team,
          ...teamHistory,
          rotationOrder,
        };
      },
    );

  candidates.sort(
    (
      left,
      right,
    ) => {
      if (
        left.restCount !==
        right.restCount
      ) {
        return (
          left.restCount -
          right.restCount
        );
      }

      if (
        left.playCount !==
        right.playCount
      ) {
        return (
          right.playCount -
          left.playCount
        );
      }

      if (
        left.lastRestRound !==
        right.lastRestRound
      ) {
        return (
          left.lastRestRound -
          right.lastRestRound
        );
      }

      return (
        left.rotationOrder -
        right.rotationOrder
      );
    },
  );

  return new Set(
    candidates
      .slice(
        0,
        restCount,
      )
      .map(
        (team) =>
          team.id,
      ),
  );
}

export async function createCompetitionRound(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const division =
    normalizeDivision(
      payload,
    );

  if (
    division.game !==
    "PUBG"
  ) {
    throw new ApiError(
      "PUBG turnirlari competition modulida boshqariladi.",
      400,
      "PUBG_COMPETITION_ONLY",
    );
  }

  const settings =
    await ensureSettings(
      env,
      division,
    );

  const teams =
    await getDivisionTeams(
      env,
      division,
    );

  if (
    teams.length === 0
  ) {
    throw new ApiError(
      "Ushbu ligada tasdiqlangan jamoa mavjud emas.",
      409,
      "COMPETITION_TEAMS_EMPTY",
    );
  }

  const lastRound =
    await queryFirst(
      database,
      `
        SELECT
          MAX(round_number)
            AS lastRoundNumber

        FROM competition_rounds

        WHERE
          season = ?
          AND game = ?
          AND league_tier = ?
          AND competition_type = ?
      `,
      [
        division.season,
        division.game,
        division.leagueTier,
        division.competitionType,
      ],
    );

  const roundNumber =
    Number(
      lastRound
        ?.lastRoundNumber ||
      0,
    ) + 1;

  const activeTeamCount =
    Math.min(
      Number(
        settings
          ?.activeTeamsPerRound ||
        DEFAULT_ACTIVE_TEAMS,
      ),
      teams.length,
    );

  const restCount =
    Math.max(
      0,
      teams.length -
        activeTeamCount,
    );

  const history =
    await getRoundHistory(
      env,
      division,
    );

  const restTeamIds =
    chooseRestTeams({
      teams,
      history,
      restCount,
      roundNumber,
    });

  const roundId =
    randomId();

  const now =
    new Date()
      .toISOString();

  const createdBy =
    cleanText(
      inputValue(
        payload,
        "adminName",
        "",
      ),
    ) ||
    "Liga Arena Admin";

  const statements = [
    makeStatement(
      database,
      `
        INSERT INTO competition_rounds (
          id,
          season,
          game,
          league_tier,
          competition_type,
          round_number,
          status,
          maps_per_round,
          created_by,
          created_at,
          completed_at,
          updated_at
        )

        VALUES (
          ?, ?, ?, ?, ?, ?,
          'DRAFT',
          4,
          ?, ?,
          '',
          ?
        )
      `,
      [
        roundId,
        division.season,
        division.game,
        division.leagueTier,
        division.competitionType,
        roundNumber,
        createdBy,
        now,
        now,
      ],
    ),
  ];

  for (
    const teamChunk of
    chunkArray(
      teams,
      25,
    )
  ) {
    const placeholders =
      teamChunk.map(
        () =>
          "(?, ?, ?, ?)",
      ).join(", ");

    const parameters = [];

    for (
      const team of
      teamChunk
    ) {
      parameters.push(
        roundId,
        team.id,
        restTeamIds.has(
          team.id,
        )
          ? "REST"
          : "PLAY",
        now,
      );
    }

    statements.push(
      makeStatement(
        database,
        `
          INSERT INTO competition_round_teams (
            round_id,
            team_id,
            participation,
            created_at
          )
          VALUES ${placeholders}
        `,
        parameters,
      ),
    );
  }

  await executeBatch(
    database,
    statements,
  );

  return getCompetitionRound(
    env,
    roundId,
  );
}

async function requireRawRound(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  const round =
    await queryFirst(
      database,
      `
        SELECT *
        FROM competition_rounds
        WHERE id = ?
        LIMIT 1
      `,
      [
        cleanText(
          roundId,
        ),
      ],
    );

  if (!round) {
    throw new ApiError(
      "Tur topilmadi.",
      404,
      "COMPETITION_ROUND_NOT_FOUND",
    );
  }

  return round;
}

export async function getCompetitionRound(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  const round =
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          game,
          league_tier AS leagueTier,
          competition_type AS competitionType,
          round_number AS roundNumber,
          status,
          maps_per_round AS mapsPerRound,
          created_by AS createdBy,
          created_at AS createdAt,
          completed_at AS completedAt,
          updated_at AS updatedAt

        FROM competition_rounds

        WHERE id = ?
        LIMIT 1
      `,
      [
        cleanText(
          roundId,
        ),
      ],
    );

  if (!round) {
    throw new ApiError(
      "Tur topilmadi.",
      404,
      "COMPETITION_ROUND_NOT_FOUND",
    );
  }

  const [
    teams,
    mapRows,
  ] =
    await Promise.all([
      queryAll(
        database,
        `
          SELECT
            t.id,
            t.technical_number AS technicalNumber,
            t.name,
            t.tag,
            t.region,
            t.logo_url AS logoUrl,
            rt.participation

          FROM competition_round_teams rt

          INNER JOIN teams t
            ON t.id = rt.team_id

          WHERE rt.round_id = ?

          ORDER BY
            CASE
              WHEN rt.participation = 'PLAY'
                THEN 1
              ELSE 2
            END,
            t.technical_number ASC
        `,
        [
          cleanText(
            roundId,
          ),
        ],
      ),

      queryAll(
        database,
        `
          SELECT
            team_id AS teamId,
            map_number AS mapNumber,
            placement,
            kills,
            placement_points AS placementPoints,
            total_points AS totalPoints

          FROM competition_map_results

          WHERE round_id = ?

          ORDER BY
            team_id,
            map_number ASC
        `,
        [
          cleanText(
            roundId,
          ),
        ],
      ),
    ]);

  const mapsByTeam =
    new Map();

  for (
    const map of
    mapRows
  ) {
    const list =
      mapsByTeam.get(
        map.teamId,
      ) || [];

    list.push({
      mapNumber:
        Number(
          map.mapNumber ||
          0,
        ),

      placement:
        Number(
          map.placement ||
          0,
        ),

      kills:
        Number(
          map.kills ||
          0,
        ),

      placementPoints:
        Number(
          map.placementPoints ||
          0,
        ),

      totalPoints:
        Number(
          map.totalPoints ||
          0,
        ),
    });

    mapsByTeam.set(
      map.teamId,
      list,
    );
  }

  const mappedTeams =
    teams.map(
      (team) => {
        const maps =
          mapsByTeam.get(
            team.id,
          ) || [];

        const totalKills =
          maps.reduce(
            (
              total,
              map,
            ) =>
              total +
              map.kills,
            0,
          );

        const totalPoints =
          maps.reduce(
            (
              total,
              map,
            ) =>
              total +
              map.totalPoints,
            0,
          );

        return {
          ...team,
          maps,
          totalKills,
          totalPoints,

          complete:
            team.participation ===
              "REST" ||
            maps.length ===
              Number(
                round.mapsPerRound ||
                0,
              ),
        };
      },
    );

  const playingTeams =
    mappedTeams.filter(
      (team) =>
        team.participation ===
        "PLAY",
    );

  const restTeams =
    mappedTeams.filter(
      (team) =>
        team.participation ===
        "REST",
    );

  return {
    ...round,

    roundNumber:
      Number(
        round.roundNumber ||
        0,
      ),

    mapsPerRound:
      Number(
        round.mapsPerRound ||
        0,
      ),

    teams:
      mappedTeams,

    playingTeams,
    restTeams,

    counts: {
      total:
        mappedTeams.length,

      playing:
        playingTeams.length,

      resting:
        restTeams.length,

      completed:
        playingTeams.filter(
          (team) =>
            team.complete,
        ).length,
    },
  };
}

export async function saveCompetitionTeamResults(
  env,
  roundId,
  teamId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const round =
    await requireRawRound(
      env,
      roundId,
    );

  const assignment =
    await queryFirst(
      database,
      `
        SELECT participation
        FROM competition_round_teams
        WHERE
          round_id = ?
          AND team_id = ?
        LIMIT 1
      `,
      [
        cleanText(
          roundId,
        ),
        cleanText(
          teamId,
        ),
      ],
    );

  if (!assignment) {
    throw new ApiError(
      "Jamoa ushbu turga biriktirilmagan.",
      404,
      "ROUND_TEAM_NOT_FOUND",
    );
  }

  if (
    assignment.participation !==
    "PLAY"
  ) {
    throw new ApiError(
      "Dam olayotgan jamoaga natija kiritib bo‘lmaydi.",
      409,
      "REST_TEAM_RESULTS_FORBIDDEN",
    );
  }

  const maps =
    Array.isArray(
      payload.maps,
    )
      ? payload.maps
      : [];

  const mapsPerRound =
    Number(
      round.maps_per_round ||
      DEFAULT_MAPS_PER_ROUND,
    );

  if (
    maps.length !==
    mapsPerRound
  ) {
    throw new ApiError(
      `Har bir tur uchun ${mapsPerRound} ta karta natijasi kiritilishi kerak.`,
      400,
      "ROUND_MAPS_INCOMPLETE",
    );
  }

  const normalizedMaps =
    maps.map(
      (
        map,
        index,
      ) => {
        const placement =
          normalizeInteger(
            map.placement,
            `${index + 1}-karta o‘rni`,
            {
              minimum: 1,
              maximum: 100,
              code:
                "INVALID_COMPETITION_NUMBER",
            },
          );

        const kills =
          normalizeInteger(
            map.kills,
            `${index + 1}-karta killari`,
            {
              minimum: 0,
              maximum: 999,
              code:
                "INVALID_COMPETITION_NUMBER",
            },
          );

        const placementScore =
          calculatePlacementPoints(
            placement,
          );

        return {
          mapNumber:
            index + 1,

          placement,
          kills,

          placementPoints:
            placementScore,

          totalPoints:
            placementScore +
            kills,
        };
      },
    );

  const now =
    new Date()
      .toISOString();

  const placeholders =
    normalizedMaps.map(
      () =>
        "(?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).join(", ");

  const mapParameters = [];

  for (
    const map of
    normalizedMaps
  ) {
    mapParameters.push(
      cleanText(
        roundId,
      ),
      cleanText(
        teamId,
      ),
      map.mapNumber,
      map.placement,
      map.kills,
      map.placementPoints,
      map.totalPoints,
      now,
      now,
    );
  }

  await executeBatch(
    database,
    [
      makeStatement(
        database,
        `
          DELETE FROM competition_map_results
          WHERE
            round_id = ?
            AND team_id = ?
        `,
        [
          cleanText(
            roundId,
          ),
          cleanText(
            teamId,
          ),
        ],
      ),

      makeStatement(
        database,
        `
          INSERT INTO competition_map_results (
            round_id,
            team_id,
            map_number,
            placement,
            kills,
            placement_points,
            total_points,
            created_at,
            updated_at
          )
          VALUES ${placeholders}
        `,
        mapParameters,
      ),

      makeStatement(
        database,
        `
          UPDATE competition_rounds
          SET
            status =
              CASE
                WHEN status = 'DRAFT'
                  THEN 'OPEN'
                ELSE status
              END,
            updated_at = ?
          WHERE id = ?
        `,
        [
          now,
          cleanText(
            roundId,
          ),
        ],
      ),
    ],
  );

  return getCompetitionRound(
    env,
    roundId,
  );
}

export async function completeCompetitionRound(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  const round =
    await getCompetitionRound(
      env,
      roundId,
    );

  const incompleteTeams =
    round.playingTeams.filter(
      (team) =>
        !team.complete,
    );

  if (
    incompleteTeams.length >
    0
  ) {
    const teams =
      incompleteTeams
        .slice(
          0,
          10,
        )
        .map(
          (team) =>
            `${team.technicalNumber} — ${team.name}`,
        )
        .join(", ");

    throw new ApiError(
      `Tur yakunlanmagan. Natijasi to‘liq bo‘lmagan jamoalar: ${teams}.`,
      409,
      "ROUND_RESULTS_INCOMPLETE",
    );
  }

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
      UPDATE competition_rounds
      SET
        status = 'COMPLETED',
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      now,
      now,
      cleanText(
        roundId,
      ),
    ],
  );

  return getCompetitionRound(
    env,
    roundId,
  );
}

export async function deleteCompetitionRound(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  await requireRawRound(
    env,
    roundId,
  );

  await execute(
    database,
    `
      DELETE FROM competition_rounds
      WHERE id = ?
    `,
    [
      cleanText(
        roundId,
      ),
    ],
  );

  return {
    id:
      cleanText(
        roundId,
      ),

    deleted: true,
  };
}

async function listCompetitionRounds(
  env,
  division,
) {
  const database =
    requireDatabase(env);

  const rows =
    await queryAll(
      database,
      `
        SELECT
          r.id,
          r.round_number AS roundNumber,
          r.status,
          r.maps_per_round AS mapsPerRound,
          r.created_at AS createdAt,
          r.completed_at AS completedAt,

          COUNT(
            rt.team_id
          ) AS totalTeams,

          SUM(
            CASE
              WHEN rt.participation = 'PLAY'
                THEN 1
              ELSE 0
            END
          ) AS playingTeams,

          SUM(
            CASE
              WHEN rt.participation = 'REST'
                THEN 1
              ELSE 0
            END
          ) AS restTeams,

          SUM(
            CASE
              WHEN
                rt.participation = 'PLAY'
                AND (
                  SELECT COUNT(*)
                  FROM competition_map_results mr
                  WHERE
                    mr.round_id = r.id
                    AND mr.team_id = rt.team_id
                ) = r.maps_per_round
                THEN 1
              ELSE 0
            END
          ) AS readyTeams

        FROM competition_rounds r

        LEFT JOIN competition_round_teams rt
          ON rt.round_id = r.id

        WHERE
          r.season = ?
          AND r.game = ?
          AND r.league_tier = ?
          AND r.competition_type = ?

        GROUP BY r.id

        ORDER BY
          r.round_number DESC
      `,
      [
        division.season,
        division.game,
        division.leagueTier,
        division.competitionType,
      ],
    );

  return rows.map(
    (row) => ({
      ...row,

      roundNumber:
        Number(
          row.roundNumber ||
          0,
        ),

      mapsPerRound:
        Number(
          row.mapsPerRound ||
          0,
        ),

      totalTeams:
        Number(
          row.totalTeams ||
          0,
        ),

      playingTeams:
        Number(
          row.playingTeams ||
          0,
        ),

      restTeams:
        Number(
          row.restTeams ||
          0,
        ),

      readyTeams:
        Number(
          row.readyTeams ||
          0,
        ),
    }),
  );
}

export async function getCompetitionStandings(
  env,
  source = {},
) {
  const database =
    requireDatabase(env);

  const division =
    normalizeDivision(
      source,
    );

  const settings =
    await ensureSettings(
      env,
      division,
    );

  const [
    teams,
    rounds,
    resultRows,
  ] =
    await Promise.all([
      getDivisionTeams(
        env,
        division,
      ),

      listCompetitionRounds(
        env,
        division,
      ),

      queryAll(
        database,
        `
          SELECT
            rt.team_id AS teamId,
            r.id AS roundId,
            r.round_number AS roundNumber,
            rt.participation,

            COALESCE(
              SUM(
                m.kills
              ),
              0
            ) AS kills,

            COALESCE(
              SUM(
                m.total_points
              ),
              0
            ) AS points,

            COALESCE(
              SUM(
                CASE
                  WHEN m.placement = 1
                    THEN 1
                  ELSE 0
                END
              ),
              0
            ) AS firstPlaces

          FROM competition_round_teams rt

          INNER JOIN competition_rounds r
            ON r.id = rt.round_id

          LEFT JOIN competition_map_results m
            ON
              m.round_id = rt.round_id
              AND m.team_id = rt.team_id

          WHERE
            r.season = ?
            AND r.game = ?
            AND r.league_tier = ?
            AND r.competition_type = ?
            AND r.status = 'COMPLETED'

          GROUP BY
            rt.team_id,
            r.id,
            r.round_number,
            rt.participation

          ORDER BY
            r.round_number ASC
        `,
        [
          division.season,
          division.game,
          division.leagueTier,
          division.competitionType,
        ],
      ),
    ]);

  const completedRounds =
    rounds.filter(
      (round) =>
        round.status ===
        "COMPLETED",
    );

  const openRounds =
    rounds.filter(
      (round) =>
        round.status !==
        "COMPLETED",
    );

  const resultMap =
    new Map();

  for (
    const team of
    teams
  ) {
    resultMap.set(
      team.id,
      {
        ...team,

        playedRounds: 0,
        restRounds: 0,
        totalKills: 0,
        totalPoints: 0,
        firstPlaces: 0,
        lastRoundNumber: 0,
        lastRoundPoints: 0,
      },
    );
  }

  for (
    const row of
    resultRows
  ) {
    const current =
      resultMap.get(
        row.teamId,
      );

    if (!current) {
      continue;
    }

    if (
      row.participation ===
      "REST"
    ) {
      current.restRounds +=
        1;

      continue;
    }

    const kills =
      Number(
        row.kills ||
        0,
      );

    const points =
      Number(
        row.points ||
        0,
      );

    const firstPlaces =
      Number(
        row.firstPlaces ||
        0,
      );

    const roundNumber =
      Number(
        row.roundNumber ||
        0,
      );

    current.playedRounds +=
      1;

    current.totalKills +=
      kills;

    current.totalPoints +=
      points;

    current.firstPlaces +=
      firstPlaces;

    if (
      roundNumber >=
      current.lastRoundNumber
    ) {
      current.lastRoundNumber =
        roundNumber;

      current.lastRoundPoints =
        points;
    }
  }

  const values =
    [
      ...resultMap.values(),
    ];

  const playedValues =
    values.map(
      (team) =>
        team.playedRounds,
    );

  const minimumPlayed =
    playedValues.length >
    0
      ? Math.min(
          ...playedValues,
        )
      : 0;

  const maximumPlayed =
    playedValues.length >
    0
      ? Math.max(
          ...playedValues,
        )
      : 0;

  const playDifference =
    maximumPlayed -
    minimumPlayed;

  const allEqual =
    playDifference ===
    0;

  for (
    const team of
    values
  ) {
    team.averagePoints =
      team.playedRounds >
      0
        ? team.totalPoints /
          team.playedRounds
        : 0;

    team.averageKills =
      team.playedRounds >
      0
        ? team.totalKills /
          team.playedRounds
        : 0;
  }

  values.sort(
    (
      left,
      right,
    ) => {
      if (!allEqual) {
        if (
          right.averagePoints !==
          left.averagePoints
        ) {
          return (
            right.averagePoints -
            left.averagePoints
          );
        }

        if (
          right.averageKills !==
          left.averageKills
        ) {
          return (
            right.averageKills -
            left.averageKills
          );
        }
      }

      if (
        right.totalPoints !==
        left.totalPoints
      ) {
        return (
          right.totalPoints -
          left.totalPoints
        );
      }

      if (
        right.totalKills !==
        left.totalKills
      ) {
        return (
          right.totalKills -
          left.totalKills
        );
      }

      if (
        right.firstPlaces !==
        left.firstPlaces
      ) {
        return (
          right.firstPlaces -
          left.firstPlaces
        );
      }

      if (
        right.lastRoundPoints !==
        left.lastRoundPoints
      ) {
        return (
          right.lastRoundPoints -
          left.lastRoundPoints
        );
      }

      return (
        technicalOrder(
          left.technicalNumber,
        ) -
        technicalOrder(
          right.technicalNumber,
        )
      );
    },
  );

  const promoteCount =
    Number(
      settings
        ?.promoteCount ||
      0,
    );

  const relegateCount =
    Number(
      settings
        ?.relegateCount ||
      0,
    );

  const minimumTeamsForZones =
    promoteCount +
    relegateCount;

  const zonesAvailable =
    division.competitionType ===
      "QUALIFIER" &&
    teams.length >=
      minimumTeamsForZones;

  const fairnessReady =
    completedRounds.length >
      0 &&
    openRounds.length ===
      0 &&
    allEqual;

  const standings =
    values.map(
      (
        team,
        index,
      ) => {
        const rank =
          index + 1;

        let zone = "";

        if (
          zonesAvailable
        ) {
          if (
            rank <=
            promoteCount
          ) {
            zone =
              "PROMOTE";
          } else if (
            rank >
            values.length -
              relegateCount
          ) {
            zone =
              "RELEGATE";
          } else {
            zone =
              "STAY";
          }
        }

        return {
          ...team,
          rank,
          zone,

          zoneFinal:
            zonesAvailable &&
            fairnessReady,
        };
      },
    );

  const issues = [];

  if (
    teams.length <
    minimumTeamsForZones
  ) {
    issues.push(
      `Saralash zonalari uchun kamida ${minimumTeamsForZones} ta jamoa kerak.`,
    );
  }

  if (
    playDifference >
    0
  ) {
    issues.push(
      `Jamoalarning o‘ynagan turlari orasida ${playDifference} tur farq bor.`,
    );
  }

  if (
    openRounds.length >
    0
  ) {
    issues.push(
      `${openRounds.length} ta tur hali yakunlanmagan.`,
    );
  }

  return {
    division,
    settings,
    rounds,
    standings,

    fairness: {
      teamCount:
        teams.length,

      completedRounds:
        completedRounds.length,

      openRounds:
        openRounds.length,

      minimumPlayed,
      maximumPlayed,
      playDifference,
      allEqual,

      provisional:
        !allEqual,

      zonesAvailable,

      canFinalize:
        zonesAvailable &&
        fairnessReady,

      issues,
    },
  };
}

function getPubgTargetLeague(
  currentLeagueTier,
  zone,
) {
  const index =
    pubgLeagueOrder.indexOf(
      currentLeagueTier,
    );

  if (
    index < 0
  ) {
    return currentLeagueTier;
  }

  if (
    zone ===
    "PROMOTE"
  ) {
    return (
      pubgLeagueOrder[
        index - 1
      ] ||
      currentLeagueTier
    );
  }

  if (
    zone ===
    "RELEGATE"
  ) {
    return (
      pubgLeagueOrder[
        index + 1
      ] ||
      currentLeagueTier
    );
  }

  return currentLeagueTier;
}

async function getCompetitionFinalization(
  env,
  division,
) {
  const database =
    requireDatabase(env);

  return (
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          next_season AS nextSeason,
          game,
          league_tier AS leagueTier,
          competition_type AS competitionType,
          team_count AS teamCount,
          promote_count AS promoteCount,
          relegate_count AS relegateCount,
          completed_rounds AS completedRounds,
          finalized_by AS finalizedBy,
          finalized_at AS finalizedAt

        FROM competition_finalizations

        WHERE
          season = ?
          AND game = ?
          AND league_tier = ?
          AND competition_type = ?

        LIMIT 1
      `,
      [
        division.season,
        division.game,
        division.leagueTier,
        division.competitionType,
      ],
    )
  ) || null;
}

export async function finalizeCompetitionSeason(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const division =
    normalizeDivision(
      payload,
    );

  if (
    division.game !==
      "PUBG" ||
    division.competitionType !==
      "QUALIFIER"
  ) {
    throw new ApiError(
      "Bu yakunlash tizimi faqat PUBG saralash musobaqasi uchun ishlaydi.",
      400,
      "PUBG_FINALIZATION_ONLY",
    );
  }

  const existing =
    await getCompetitionFinalization(
      env,
      division,
    );

  if (existing) {
    throw new ApiError(
      "Ushbu PUBG saralashi avval yakunlangan.",
      409,
      "PUBG_COMPETITION_ALREADY_FINALIZED",
    );
  }

  const overview =
    await getCompetitionStandings(
      env,
      division,
    );

  const standings =
    Array.isArray(
      overview
        ?.standings,
    )
      ? overview.standings
      : [];

  const settings =
    overview.settings;

  if (
    standings.length ===
    0
  ) {
    throw new ApiError(
      "Yakunlash uchun PUBG turnir jadvali mavjud emas.",
      409,
      "PUBG_STANDINGS_EMPTY",
    );
  }

  const roundStatus =
    await queryFirst(
      database,
      `
        SELECT
          SUM(
            CASE
              WHEN status = 'COMPLETED'
                THEN 1
              ELSE 0
            END
          ) AS completedRounds,

          SUM(
            CASE
              WHEN status != 'COMPLETED'
                THEN 1
              ELSE 0
            END
          ) AS unfinishedRounds

        FROM competition_rounds

        WHERE
          season = ?
          AND game = ?
          AND league_tier = ?
          AND competition_type = ?
      `,
      [
        division.season,
        division.game,
        division.leagueTier,
        division.competitionType,
      ],
    );

  const completedRounds =
    Number(
      roundStatus
        ?.completedRounds ||
      0,
    );

  const unfinishedRounds =
    Number(
      roundStatus
        ?.unfinishedRounds ||
      0,
    );

  if (
    completedRounds ===
    0
  ) {
    throw new ApiError(
      "PUBG saralashini yakunlash uchun kamida bitta tugallangan tur kerak.",
      409,
      "PUBG_NO_COMPLETED_ROUNDS",
    );
  }

  if (
    unfinishedRounds >
    0
  ) {
    throw new ApiError(
      `${unfinishedRounds} ta PUBG turi hali yakunlanmagan.`,
      409,
      "PUBG_OPEN_ROUNDS_EXIST",
    );
  }

  const playedValues =
    standings.map(
      (team) =>
        Number(
          team.playedRounds ||
          0,
        ),
    );

  const minimumPlayed =
    Math.min(
      ...playedValues,
    );

  const maximumPlayed =
    Math.max(
      ...playedValues,
    );

  if (
    minimumPlayed !==
    maximumPlayed
  ) {
    throw new ApiError(
      `Barcha jamoalar teng tur o‘ynamagan. Eng kam ${minimumPlayed}, eng ko‘p ${maximumPlayed}.`,
      409,
      "PUBG_PLAY_COUNT_NOT_EQUAL",
    );
  }

  const promoteCount =
    Number(
      settings
        ?.promoteCount ||
      0,
    );

  const relegateCount =
    Number(
      settings
        ?.relegateCount ||
      0,
    );

  if (
    standings.length <
    promoteCount +
      relegateCount
  ) {
    throw new ApiError(
      `Promotion va relegation uchun kamida ${promoteCount + relegateCount} ta jamoa kerak.`,
      409,
      "PUBG_NOT_ENOUGH_TEAMS_FOR_ZONES",
    );
  }

  const invalidZoneTeam =
    standings.find(
      (team) =>
        ![
          "PROMOTE",
          "STAY",
          "RELEGATE",
        ].includes(
          team.zone,
        ),
    );

  if (
    invalidZoneTeam
  ) {
    throw new ApiError(
      "Yakuniy promotion va relegation zonalari hali tayyor emas.",
      409,
      "PUBG_ZONES_NOT_READY",
    );
  }

  const finalizationId =
    randomId();

  const nextSeason =
    getNextSeason(
      division.season,
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

  const finalizedStandings =
    standings.map(
      (team) => {
        const targetLeagueTier =
          getPubgTargetLeague(
            division.leagueTier,
            team.zone,
          );

        return {
          ...team,

          sourceLeagueTier:
            division.leagueTier,

          targetLeagueTier,
          nextSeason,
          zoneFinal: true,
        };
      },
    );

  const statements = [
    makeStatement(
      database,
      `
        INSERT INTO competition_finalizations (
          id,
          season,
          next_season,
          game,
          league_tier,
          competition_type,
          team_count,
          promote_count,
          relegate_count,
          completed_rounds,
          finalized_by,
          finalized_at
        )

        VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `,
      [
        finalizationId,
        division.season,
        nextSeason,
        division.game,
        division.leagueTier,
        division.competitionType,
        finalizedStandings.length,
        promoteCount,
        relegateCount,
        completedRounds,
        adminName,
        now,
      ],
    ),
  ];

  for (
    const teamChunk of
    chunkArray(
      finalizedStandings,
      5,
    )
  ) {
    const placeholders =
      teamChunk.map(
        () =>
          "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).join(", ");

    const parameters = [];

    for (
      const team of
      teamChunk
    ) {
      parameters.push(
        finalizationId,
        team.id,
        team.rank,
        team.zone,
        team.technicalNumber,
        team.name,
        team.tag || "",
        team.region || "",
        team.logoUrl || "",
        division.leagueTier,
        team.targetLeagueTier,
        Number(
          team.playedRounds ||
          0,
        ),
        Number(
          team.restRounds ||
          0,
        ),
        Number(
          team.totalKills ||
          0,
        ),
        Number(
          team.totalPoints ||
          0,
        ),
        Number(
          team.firstPlaces ||
          0,
        ),
        Number(
          team.lastRoundPoints ||
          0,
        ),
      );
    }

    statements.push(
      makeStatement(
        database,
        `
          INSERT INTO competition_final_results (
            finalization_id,
            team_id,
            rank,
            zone,
            technical_number,
            team_name,
            team_tag,
            region,
            logo_url,
            source_league_tier,
            target_league_tier,
            played_rounds,
            rest_rounds,
            total_kills,
            total_points,
            first_places,
            last_round_points
          )
          VALUES ${placeholders}
        `,
        parameters,
      ),
    );
  }

  for (
    const teamChunk of
    chunkArray(
      finalizedStandings,
      30,
    )
  ) {
    const caseParts = [];
    const parameters = [
      nextSeason,
    ];

    for (
      const team of
      teamChunk
    ) {
      caseParts.push(
        "WHEN ? THEN ?",
      );

      parameters.push(
        team.id,
        team.targetLeagueTier,
      );
    }

    const idPlaceholders =
      teamChunk.map(
        () =>
          "?",
      ).join(", ");

    parameters.push(
      now,
      ...teamChunk.map(
        (team) =>
          team.id,
      ),
    );

    statements.push(
      makeStatement(
        database,
        `
          UPDATE teams
          SET
            next_season = ?,
            next_league_tier =
              CASE id
                ${caseParts.join(
                  " ",
                )}
                ELSE next_league_tier
              END,
            updated_at = ?
          WHERE id IN (
            ${idPlaceholders}
          )
        `,
        parameters,
      ),
    );
  }

  await executeBatch(
    database,
    statements,
  );

  return {
    finalization:
      await getCompetitionFinalization(
        env,
        division,
      ),

    standings:
      finalizedStandings,

    fairness: {
      minimumPlayed,
      maximumPlayed,

      playDifference:
        maximumPlayed -
        minimumPlayed,

      completedRounds,
      unfinishedRounds: 0,
      zonesAvailable: true,
      canFinalize: false,
      finalized: true,
    },
  };
}

export async function getCompetitionOverview(
  env,
  source = {},
) {
  return getCompetitionStandings(
    env,
    source,
  );
}
