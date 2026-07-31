import {
  ApiError,
  cleanText,
  execute,
  executeBatch,
  getActiveSeason,
  getNextSeason,
  inputValue,
  makeStatement,
  normalizeInteger,
  normalizeLeagueTier,
  normalizeSeason,
  queryAll,
  queryFirst,
  randomId,
  requireDatabase,
} from "./tournament-utils.js";

const orderedLeagueTiers = [
  "IMPERIUM",
  "ABYSSAL",
  "DAWN",
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

function getTargetLeagueTier(
  currentLeagueTier,
  zone,
) {
  const index =
    orderedLeagueTiers.indexOf(
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
      orderedLeagueTiers[
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
      orderedLeagueTiers[
        index + 1
      ] ||
      currentLeagueTier
    );
  }

  return currentLeagueTier;
}

async function normalizeContext(
  env,
  source = {},
) {
  const providedSeason =
    cleanText(
      inputValue(
        source,
        "season",
        "",
      ),
    );

  const season =
    providedSeason
      ? normalizeSeason(
          providedSeason,
        )
      : await getActiveSeason(
          env,
        );

  return {
    season,

    leagueTier:
      normalizeLeagueTier(
        "MLBB",
        inputValue(
          source,
          "leagueTier",
          "DAWN",
        ),
        {
          code:
            "INVALID_MLBB_LEAGUE",
        },
      ),
  };
}

async function getMlbbFinalization(
  env,
  context,
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
          league_tier AS leagueTier,
          team_count AS teamCount,
          promote_count AS promoteCount,
          relegate_count AS relegateCount,
          completed_rounds AS completedRounds,
          finalized_by AS finalizedBy,
          finalized_at AS finalizedAt

        FROM mlbb_finalizations

        WHERE
          season = ?
          AND league_tier = ?

        LIMIT 1
      `,
      [
        context.season,
        context.leagueTier,
      ],
    )
  ) || null;
}

async function ensureSettings(
  env,
  context,
) {
  const database =
    requireDatabase(env);

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
      INSERT OR IGNORE INTO mlbb_settings (
        season,
        league_tier,
        best_of,
        win_points,
        loss_points,
        promote_count,
        relegate_count,
        updated_by,
        updated_at
      )
      VALUES (
        ?, ?, 3, 3, 0,
        25, 25,
        'Liga Arena Admin',
        ?
      )
    `,
    [
      context.season,
      context.leagueTier,
      now,
    ],
  );

  return queryFirst(
    database,
    `
      SELECT
        season,
        league_tier AS leagueTier,
        best_of AS bestOf,
        win_points AS winPoints,
        loss_points AS lossPoints,
        promote_count AS promoteCount,
        relegate_count AS relegateCount,
        updated_by AS updatedBy,
        updated_at AS updatedAt

      FROM mlbb_settings

      WHERE
        season = ?
        AND league_tier = ?

      LIMIT 1
    `,
    [
      context.season,
      context.leagueTier,
    ],
  );
}

export async function saveMlbbSettings(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const context =
    await normalizeContext(
      env,
      payload,
    );

  if (
    await getMlbbFinalization(
      env,
      context,
    )
  ) {
    throw new ApiError(
      "MLBB mavsumi yakunlangan. Sozlamalarni o‘zgartirib bo‘lmaydi.",
      409,
      "MLBB_SETTINGS_FINALIZED",
    );
  }

  const bestOf =
    normalizeInteger(
      inputValue(
        payload,
        "bestOf",
        3,
      ),
      "Best Of",
      {
        minimum: 1,
        maximum: 9,
        code:
          "INVALID_MLBB_NUMBER",
      },
    );

  if (
    bestOf % 2 ===
    0
  ) {
    throw new ApiError(
      "Best Of toq son bo‘lishi kerak.",
      400,
      "MLBB_BEST_OF_MUST_BE_ODD",
    );
  }

  const winPoints =
    normalizeInteger(
      inputValue(
        payload,
        "winPoints",
        3,
      ),
      "G‘alaba bali",
      {
        minimum: 0,
        maximum: 100,
        code:
          "INVALID_MLBB_NUMBER",
      },
    );

  const lossPoints =
    normalizeInteger(
      inputValue(
        payload,
        "lossPoints",
        0,
      ),
      "Mag‘lubiyat bali",
      {
        minimum: 0,
        maximum: 100,
        code:
          "INVALID_MLBB_NUMBER",
      },
    );

  const promoteCount =
    normalizeInteger(
      inputValue(
        payload,
        "promoteCount",
        25,
      ),
      "Yuqoriga o‘tadigan jamoalar",
      {
        minimum: 0,
        maximum: 100,
        code:
          "INVALID_MLBB_NUMBER",
      },
    );

  const relegateCount =
    normalizeInteger(
      inputValue(
        payload,
        "relegateCount",
        25,
      ),
      "Quyiga tushadigan jamoalar",
      {
        minimum: 0,
        maximum: 100,
        code:
          "INVALID_MLBB_NUMBER",
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
      INSERT INTO mlbb_settings (
        season,
        league_tier,
        best_of,
        win_points,
        loss_points,
        promote_count,
        relegate_count,
        updated_by,
        updated_at
      )

      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )

      ON CONFLICT (
        season,
        league_tier
      )

      DO UPDATE SET
        best_of =
          excluded.best_of,

        win_points =
          excluded.win_points,

        loss_points =
          excluded.loss_points,

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
      context.season,
      context.leagueTier,
      bestOf,
      winPoints,
      lossPoints,
      promoteCount,
      relegateCount,
      adminName,
      now,
    ],
  );

  return ensureSettings(
    env,
    context,
  );
}

async function getApprovedTeams(
  env,
  context,
) {
  const database =
    requireDatabase(env);

  return queryAll(
    database,
    `
      SELECT
        id,
        technical_number AS technicalNumber,
        name,
        tag,
        region,
        logo_url AS logoUrl

      FROM teams

      WHERE
        season = ?
        AND game = 'MLBB'
        AND league_tier = ?
        AND status = 'APPROVED'

      ORDER BY
        technical_number ASC,
        name ASC
    `,
    [
      context.season,
      context.leagueTier,
    ],
  );
}

async function getRoster(
  env,
  context,
) {
  const database =
    requireDatabase(env);

  return queryAll(
    database,
    `
      SELECT
        r.team_id AS id,
        r.seed_order AS seedOrder,
        t.technical_number AS technicalNumber,
        t.name,
        t.tag,
        t.region,
        t.logo_url AS logoUrl

      FROM mlbb_league_roster r

      INNER JOIN teams t
        ON t.id = r.team_id

      WHERE
        r.season = ?
        AND r.league_tier = ?

      ORDER BY
        r.seed_order ASC
    `,
    [
      context.season,
      context.leagueTier,
    ],
  );
}

async function ensureRoster(
  env,
  context,
) {
  const database =
    requireDatabase(env);

  const existingRoster =
    await getRoster(
      env,
      context,
    );

  if (
    existingRoster.length >
    0
  ) {
    return existingRoster;
  }

  const teams =
    await getApprovedTeams(
      env,
      context,
    );

  if (
    teams.length <
    2
  ) {
    throw new ApiError(
      "MLBB ligasini boshlash uchun kamida 2 ta tasdiqlangan jamoa kerak.",
      409,
      "MLBB_NOT_ENOUGH_TEAMS",
    );
  }

  const now =
    new Date()
      .toISOString();

  const statements = [];

  for (
    const teamChunk of
    chunkArray(
      teams,
      20,
    )
  ) {
    const placeholders =
      teamChunk.map(
        () =>
          "(?, ?, ?, ?, ?)",
      ).join(", ");

    const parameters = [];

    teamChunk.forEach(
      (
        team,
        localIndex,
      ) => {
        const globalIndex =
          teams.indexOf(
            team,
          );

        parameters.push(
          context.season,
          context.leagueTier,
          team.id,
          globalIndex + 1,
          now,
        );
      },
    );

    statements.push(
      makeStatement(
        database,
        `
          INSERT INTO mlbb_league_roster (
            season,
            league_tier,
            team_id,
            seed_order,
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

  return teams.map(
    (
      team,
      index,
    ) => ({
      ...team,
      seedOrder:
        index + 1,
    }),
  );
}

function rotateTeams(
  teams,
  count,
) {
  let result =
    [
      ...teams,
    ];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    if (
      result.length <=
      2
    ) {
      break;
    }

    result = [
      result[0],
      result[
        result.length -
        1
      ],
      ...result.slice(
        1,
        result.length -
        1,
      ),
    ];
  }

  return result;
}

function buildRoundPairings(
  roster,
  roundNumber,
) {
  const participants =
    roster.map(
      (team) =>
        team.id,
    );

  if (
    participants.length %
      2 !==
    0
  ) {
    participants.push(
      null,
    );
  }

  const totalRounds =
    participants.length -
    1;

  if (
    roundNumber >
    totalRounds
  ) {
    throw new ApiError(
      "Round-robin siklidagi barcha turlar yaratilgan.",
      409,
      "MLBB_ALL_ROUNDS_CREATED",
    );
  }

  const rotated =
    rotateTeams(
      participants,
      roundNumber -
        1,
    );

  const pairings = [];
  let byeTeamId = null;

  for (
    let index = 0;
    index <
    rotated.length / 2;
    index += 1
  ) {
    const teamA =
      rotated[index];

    const teamB =
      rotated[
        rotated.length -
        1 -
        index
      ];

    if (
      !teamA ||
      !teamB
    ) {
      byeTeamId =
        teamA ||
        teamB;

      continue;
    }

    pairings.push({
      teamAId:
        teamA,

      teamBId:
        teamB,
    });
  }

  return {
    pairings,
    byeTeamId,
    totalRounds,
  };
}

export async function createMlbbRound(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const context =
    await normalizeContext(
      env,
      payload,
    );

  const settings =
    await ensureSettings(
      env,
      context,
    );

  if (
    await getMlbbFinalization(
      env,
      context,
    )
  ) {
    throw new ApiError(
      "MLBB mavsumi yakunlangan. Yangi tur yaratib bo‘lmaydi.",
      409,
      "MLBB_SEASON_FINALIZED_ROUND",
    );
  }

  const roster =
    await ensureRoster(
      env,
      context,
    );

  const lastRound =
    await queryFirst(
      database,
      `
        SELECT
          MAX(round_number)
            AS lastRoundNumber

        FROM mlbb_rounds

        WHERE
          season = ?
          AND league_tier = ?
      `,
      [
        context.season,
        context.leagueTier,
      ],
    );

  const roundNumber =
    Number(
      lastRound
        ?.lastRoundNumber ||
      0,
    ) + 1;

  const schedule =
    buildRoundPairings(
      roster,
      roundNumber,
    );

  const roundId =
    randomId();

  const now =
    new Date()
      .toISOString();

  const adminName =
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
        INSERT INTO mlbb_rounds (
          id,
          season,
          league_tier,
          round_number,
          status,
          best_of,
          created_by,
          created_at,
          completed_at,
          updated_at
        )

        VALUES (
          ?, ?, ?, ?,
          'DRAFT',
          ?, ?, ?,
          '',
          ?
        )
      `,
      [
        roundId,
        context.season,
        context.leagueTier,
        roundNumber,
        Number(
          settings.bestOf ||
          3,
        ),
        adminName,
        now,
        now,
      ],
    ),
  ];

  for (
    const pairingChunk of
    chunkArray(
      schedule.pairings,
      16,
    )
  ) {
    const placeholders =
      pairingChunk.map(
        () =>
          "(?, ?, ?, ?, NULL, NULL, NULL, 'PENDING', ?, ?)",
      ).join(", ");

    const parameters = [];

    for (
      const pairing of
      pairingChunk
    ) {
      parameters.push(
        randomId(),
        roundId,
        pairing.teamAId,
        pairing.teamBId,
        now,
        now,
      );
    }

    statements.push(
      makeStatement(
        database,
        `
          INSERT INTO mlbb_matches (
            id,
            round_id,
            team_a_id,
            team_b_id,
            score_a,
            score_b,
            winner_team_id,
            status,
            created_at,
            updated_at
          )
          VALUES ${placeholders}
        `,
        parameters,
      ),
    );
  }

  if (
    schedule.byeTeamId
  ) {
    statements.push(
      makeStatement(
        database,
        `
          INSERT INTO mlbb_round_byes (
            round_id,
            team_id,
            created_at
          )
          VALUES (?, ?, ?)
        `,
        [
          roundId,
          schedule.byeTeamId,
          now,
        ],
      ),
    );
  }

  await executeBatch(
    database,
    statements,
  );

  return getMlbbRound(
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
        FROM mlbb_rounds
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
      "MLBB turi topilmadi.",
      404,
      "MLBB_ROUND_NOT_FOUND",
    );
  }

  return round;
}

export async function getMlbbRound(
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
          league_tier AS leagueTier,
          round_number AS roundNumber,
          status,
          best_of AS bestOf,
          created_by AS createdBy,
          created_at AS createdAt,
          completed_at AS completedAt,
          updated_at AS updatedAt

        FROM mlbb_rounds

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
      "MLBB turi topilmadi.",
      404,
      "MLBB_ROUND_NOT_FOUND",
    );
  }

  const [
    matches,
    byeTeam,
  ] =
    await Promise.all([
      queryAll(
        database,
        `
          SELECT
            m.id,
            m.team_a_id AS teamAId,
            a.technical_number AS teamATechnicalNumber,
            a.name AS teamAName,
            a.tag AS teamATag,
            a.logo_url AS teamALogoUrl,
            m.team_b_id AS teamBId,
            b.technical_number AS teamBTechnicalNumber,
            b.name AS teamBName,
            b.tag AS teamBTag,
            b.logo_url AS teamBLogoUrl,
            m.score_a AS scoreA,
            m.score_b AS scoreB,
            m.winner_team_id AS winnerTeamId,
            m.status

          FROM mlbb_matches m

          INNER JOIN teams a
            ON a.id = m.team_a_id

          INNER JOIN teams b
            ON b.id = m.team_b_id

          WHERE m.round_id = ?

          ORDER BY
            a.technical_number ASC
        `,
        [
          cleanText(
            roundId,
          ),
        ],
      ),

      queryFirst(
        database,
        `
          SELECT
            t.id,
            t.technical_number AS technicalNumber,
            t.name,
            t.tag

          FROM mlbb_round_byes b

          INNER JOIN teams t
            ON t.id = b.team_id

          WHERE b.round_id = ?

          LIMIT 1
        `,
        [
          cleanText(
            roundId,
          ),
        ],
      ),
    ]);

  const normalizedMatches =
    matches.map(
      (match) => ({
        ...match,

        scoreA:
          match.scoreA ===
            null
            ? null
            : Number(
                match.scoreA,
              ),

        scoreB:
          match.scoreB ===
            null
            ? null
            : Number(
                match.scoreB,
              ),
      }),
    );

  return {
    ...round,

    roundNumber:
      Number(
        round.roundNumber ||
        0,
      ),

    bestOf:
      Number(
        round.bestOf ||
        3,
      ),

    matches:
      normalizedMatches,

    byeTeam:
      byeTeam ||
      null,

    counts: {
      matches:
        normalizedMatches.length,

      completed:
        normalizedMatches.filter(
          (match) =>
            match.status ===
            "COMPLETED",
        ).length,
    },
  };
}

export async function saveMlbbMatchResult(
  env,
  matchId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const match =
    await queryFirst(
      database,
      `
        SELECT
          m.*,
          r.best_of AS bestOf,
          r.id AS roundId,
          r.status AS roundStatus

        FROM mlbb_matches m

        INNER JOIN mlbb_rounds r
          ON r.id = m.round_id

        WHERE m.id = ?
        LIMIT 1
      `,
      [
        cleanText(
          matchId,
        ),
      ],
    );

  if (!match) {
    throw new ApiError(
      "MLBB uchrashuvi topilmadi.",
      404,
      "MLBB_MATCH_NOT_FOUND",
    );
  }

  if (
    match.roundStatus ===
    "COMPLETED"
  ) {
    throw new ApiError(
      "Yakunlangan tur natijasini o‘zgartirib bo‘lmaydi.",
      409,
      "MLBB_ROUND_ALREADY_COMPLETED",
    );
  }

  const scoreA =
    normalizeInteger(
      inputValue(
        payload,
        "scoreA",
      ),
      "Birinchi jamoa hisobi",
      {
        minimum: 0,
        maximum: 9,
        code:
          "INVALID_MLBB_NUMBER",
      },
    );

  const scoreB =
    normalizeInteger(
      inputValue(
        payload,
        "scoreB",
      ),
      "Ikkinchi jamoa hisobi",
      {
        minimum: 0,
        maximum: 9,
        code:
          "INVALID_MLBB_NUMBER",
      },
    );

  const bestOf =
    Number(
      match.bestOf ||
      3,
    );

  const requiredWins =
    Math.floor(
      bestOf / 2,
    ) + 1;

  const valid =
    (
      scoreA ===
        requiredWins &&
      scoreB <
        requiredWins
    ) ||
    (
      scoreB ===
        requiredWins &&
      scoreA <
        requiredWins
    );

  if (!valid) {
    throw new ApiError(
      `BO${bestOf} uchun hisob ${requiredWins}-0, ${requiredWins}-1 kabi yakuniy hisob bo‘lishi kerak.`,
      400,
      "INVALID_MLBB_SERIES_SCORE",
    );
  }

  const winnerTeamId =
    scoreA >
    scoreB
      ? match.team_a_id
      : match.team_b_id;

  const now =
    new Date()
      .toISOString();

  await executeBatch(
    database,
    [
      makeStatement(
        database,
        `
          UPDATE mlbb_matches
          SET
            score_a = ?,
            score_b = ?,
            winner_team_id = ?,
            status = 'COMPLETED',
            updated_at = ?
          WHERE id = ?
        `,
        [
          scoreA,
          scoreB,
          winnerTeamId,
          now,
          cleanText(
            matchId,
          ),
        ],
      ),

      makeStatement(
        database,
        `
          UPDATE mlbb_rounds
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
          match.roundId,
        ],
      ),
    ],
  );

  return getMlbbRound(
    env,
    match.roundId,
  );
}

export async function completeMlbbRound(
  env,
  roundId,
) {
  const database =
    requireDatabase(env);

  const round =
    await getMlbbRound(
      env,
      roundId,
    );

  if (
    round.counts.completed !==
    round.counts.matches
  ) {
    throw new ApiError(
      `${round.counts.matches - round.counts.completed} ta uchrashuv natijasi hali kiritilmagan.`,
      409,
      "MLBB_ROUND_INCOMPLETE",
    );
  }

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
      UPDATE mlbb_rounds
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

  return getMlbbRound(
    env,
    roundId,
  );
}

export async function deleteMlbbRound(
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
      DELETE FROM mlbb_rounds
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

async function listRounds(
  env,
  context,
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
          r.best_of AS bestOf,
          COUNT(m.id) AS matches,

          SUM(
            CASE
              WHEN m.status = 'COMPLETED'
                THEN 1
              ELSE 0
            END
          ) AS completedMatches,

          (
            SELECT COUNT(*)
            FROM mlbb_round_byes b
            WHERE b.round_id = r.id
          ) AS byeCount

        FROM mlbb_rounds r

        LEFT JOIN mlbb_matches m
          ON m.round_id = r.id

        WHERE
          r.season = ?
          AND r.league_tier = ?

        GROUP BY r.id

        ORDER BY
          r.round_number DESC
      `,
      [
        context.season,
        context.leagueTier,
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

      bestOf:
        Number(
          row.bestOf ||
          3,
        ),

      matches:
        Number(
          row.matches ||
          0,
        ),

      completedMatches:
        Number(
          row.completedMatches ||
          0,
        ),

      byeCount:
        Number(
          row.byeCount ||
          0,
        ),
    }),
  );
}

async function getFinalizedMlbbStandings(
  env,
  context,
  settings,
  finalization,
) {
  const database =
    requireDatabase(env);

  const [
    rows,
    rounds,
  ] =
    await Promise.all([
      queryAll(
        database,
        `
          SELECT
            team_id AS id,
            technical_number AS technicalNumber,
            team_name AS name,
            team_tag AS tag,
            rank,
            zone,
            source_league_tier AS sourceLeagueTier,
            target_league_tier AS targetLeagueTier,
            played,
            wins,
            losses,
            map_wins AS mapWins,
            map_losses AS mapLosses,
            map_difference AS mapDifference,
            points

          FROM mlbb_final_results

          WHERE finalization_id = ?

          ORDER BY rank ASC
        `,
        [
          finalization.id,
        ],
      ),

      listRounds(
        env,
        context,
      ),
    ]);

  const standings =
    rows.map(
      (team) => ({
        ...team,
        rank:
          Number(
            team.rank ||
            0,
          ),
        played:
          Number(
            team.played ||
            0,
          ),
        wins:
          Number(
            team.wins ||
            0,
          ),
        losses:
          Number(
            team.losses ||
            0,
          ),
        mapWins:
          Number(
            team.mapWins ||
            0,
          ),
        mapLosses:
          Number(
            team.mapLosses ||
            0,
          ),
        mapDifference:
          Number(
            team.mapDifference ||
            0,
          ),
        points:
          Number(
            team.points ||
            0,
          ),
        zoneFinal: true,
      }),
    );

  const playedValues =
    standings.map(
      (team) =>
        team.played,
    );

  return {
    context,
    settings,
    rounds,
    standings,
    finalization,

    fairness: {
      teamCount:
        standings.length,

      completedRounds:
        Number(
          finalization
            .completedRounds ||
          0,
        ),

      totalRounds:
        Number(
          finalization
            .completedRounds ||
          0,
        ),

      remainingRounds: 0,

      minimumPlayed:
        playedValues.length >
        0
          ? Math.min(
              ...playedValues,
            )
          : 0,

      maximumPlayed:
        playedValues.length >
        0
          ? Math.max(
              ...playedValues,
            )
          : 0,

      playDifference: 0,
      seasonComplete: true,
      rosterLocked: true,
      finalized: true,
      zonesAvailable: true,
      canFinalize: false,
    },
  };
}

export async function getMlbbStandings(
  env,
  source = {},
) {
  const database =
    requireDatabase(env);

  const context =
    await normalizeContext(
      env,
      source,
    );

  const settings =
    await ensureSettings(
      env,
      context,
    );

  const existingFinalization =
    await getMlbbFinalization(
      env,
      context,
    );

  if (
    existingFinalization
  ) {
    return getFinalizedMlbbStandings(
      env,
      context,
      settings,
      existingFinalization,
    );
  }

  let roster =
    await getRoster(
      env,
      context,
    );

  if (
    roster.length ===
    0
  ) {
    roster =
      (
        await getApprovedTeams(
          env,
          context,
        )
      ).map(
        (
          team,
          index,
        ) => ({
          ...team,
          seedOrder:
            index + 1,
        }),
      );
  }

  const standingsMap =
    new Map();

  for (
    const team of
    roster
  ) {
    standingsMap.set(
      team.id,
      {
        ...team,
        seedOrder:
          Number(
            team.seedOrder ||
            0,
          ),
        played: 0,
        wins: 0,
        losses: 0,
        mapWins: 0,
        mapLosses: 0,
        points: 0,
        restRounds: 0,
      },
    );
  }

  const [
    matches,
    byes,
    rounds,
    rosterCount,
  ] =
    await Promise.all([
      queryAll(
        database,
        `
          SELECT
            m.team_a_id AS teamAId,
            m.team_b_id AS teamBId,
            m.score_a AS scoreA,
            m.score_b AS scoreB,
            m.winner_team_id AS winnerTeamId

          FROM mlbb_matches m

          INNER JOIN mlbb_rounds r
            ON r.id = m.round_id

          WHERE
            r.season = ?
            AND r.league_tier = ?
            AND r.status = 'COMPLETED'
            AND m.status = 'COMPLETED'
        `,
        [
          context.season,
          context.leagueTier,
        ],
      ),

      queryAll(
        database,
        `
          SELECT
            b.team_id AS teamId,
            COUNT(*) AS restRounds

          FROM mlbb_round_byes b

          INNER JOIN mlbb_rounds r
            ON r.id = b.round_id

          WHERE
            r.season = ?
            AND r.league_tier = ?
            AND r.status = 'COMPLETED'

          GROUP BY b.team_id
        `,
        [
          context.season,
          context.leagueTier,
        ],
      ),

      listRounds(
        env,
        context,
      ),

      queryFirst(
        database,
        `
          SELECT COUNT(*) AS count
          FROM mlbb_league_roster
          WHERE
            season = ?
            AND league_tier = ?
        `,
        [
          context.season,
          context.leagueTier,
        ],
      ),
    ]);

  for (
    const match of
    matches
  ) {
    const teamA =
      standingsMap.get(
        match.teamAId,
      );

    const teamB =
      standingsMap.get(
        match.teamBId,
      );

    if (
      !teamA ||
      !teamB
    ) {
      continue;
    }

    const scoreA =
      Number(
        match.scoreA ||
        0,
      );

    const scoreB =
      Number(
        match.scoreB ||
        0,
      );

    teamA.played += 1;
    teamB.played += 1;

    teamA.mapWins +=
      scoreA;

    teamA.mapLosses +=
      scoreB;

    teamB.mapWins +=
      scoreB;

    teamB.mapLosses +=
      scoreA;

    if (
      match.winnerTeamId ===
      match.teamAId
    ) {
      teamA.wins += 1;
      teamB.losses += 1;

      teamA.points +=
        Number(
          settings.winPoints ||
          0,
        );

      teamB.points +=
        Number(
          settings.lossPoints ||
          0,
        );
    } else {
      teamB.wins += 1;
      teamA.losses += 1;

      teamB.points +=
        Number(
          settings.winPoints ||
          0,
        );

      teamA.points +=
        Number(
          settings.lossPoints ||
          0,
        );
    }
  }

  for (
    const bye of
    byes
  ) {
    const team =
      standingsMap.get(
        bye.teamId,
      );

    if (team) {
      team.restRounds =
        Number(
          bye.restRounds ||
          0,
        );
    }
  }

  const standings =
    [
      ...standingsMap.values(),
    ];

  for (
    const team of
    standings
  ) {
    team.mapDifference =
      team.mapWins -
      team.mapLosses;
  }

  standings.sort(
    (
      left,
      right,
    ) => {
      if (
        right.points !==
        left.points
      ) {
        return (
          right.points -
          left.points
        );
      }

      if (
        right.wins !==
        left.wins
      ) {
        return (
          right.wins -
          left.wins
        );
      }

      if (
        right.mapDifference !==
        left.mapDifference
      ) {
        return (
          right.mapDifference -
          left.mapDifference
        );
      }

      if (
        right.mapWins !==
        left.mapWins
      ) {
        return (
          right.mapWins -
          left.mapWins
        );
      }

      return (
        left.seedOrder -
        right.seedOrder
      );
    },
  );

  const promoteCount =
    Number(
      settings
        .promoteCount ||
      0,
    );

  const relegateCount =
    Number(
      settings
        .relegateCount ||
      0,
    );

  const zonesAvailable =
    standings.length >=
    promoteCount +
      relegateCount;

  standings.forEach(
    (
      team,
      index,
    ) => {
      team.rank =
        index + 1;

      team.zone = "";

      if (
        zonesAvailable
      ) {
        if (
          team.rank <=
          promoteCount
        ) {
          team.zone =
            "PROMOTE";
        } else if (
          team.rank >
          standings.length -
            relegateCount
        ) {
          team.zone =
            "RELEGATE";
        } else {
          team.zone =
            "STAY";
        }
      }

      team.zoneFinal =
        false;
    },
  );

  const completedRounds =
    rounds.filter(
      (round) =>
        round.status ===
        "COMPLETED",
    ).length;

  const rosterSize =
    roster.length % 2 ===
    0
      ? roster.length
      : roster.length + 1;

  const totalRounds =
    rosterSize >
    0
      ? rosterSize -
        1
      : 0;

  const playedValues =
    standings.map(
      (team) =>
        team.played,
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

  const seasonComplete =
    totalRounds >
      0 &&
    completedRounds ===
      totalRounds;

  return {
    context,
    settings,
    rounds,
    standings,

    fairness: {
      teamCount:
        standings.length,

      completedRounds,
      totalRounds,

      remainingRounds:
        Math.max(
          0,
          totalRounds -
            completedRounds,
        ),

      minimumPlayed,
      maximumPlayed,

      playDifference:
        maximumPlayed -
        minimumPlayed,

      seasonComplete,
      zonesAvailable,

      canFinalize:
        seasonComplete &&
        zonesAvailable,

      finalized: false,

      rosterLocked:
        Number(
          rosterCount
            ?.count ||
          0,
        ) >
        0,
    },
  };
}

export async function finalizeMlbbSeason(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const context =
    await normalizeContext(
      env,
      payload,
    );

  if (
    await getMlbbFinalization(
      env,
      context,
    )
  ) {
    throw new ApiError(
      "Ushbu MLBB mavsumi avval yakunlangan.",
      409,
      "MLBB_ALREADY_FINALIZED",
    );
  }

  const overview =
    await getMlbbStandings(
      env,
      context,
    );

  if (
    !overview
      .fairness
      .seasonComplete
  ) {
    throw new ApiError(
      "MLBB mavsumini yakunlab bo‘lmaydi. Barcha round-robin turlari yakunlanishi kerak.",
      409,
      "MLBB_SEASON_INCOMPLETE",
    );
  }

  if (
    !overview
      .fairness
      .zonesAvailable
  ) {
    throw new ApiError(
      `Promotion va relegation zonalari uchun kamida ${Number(overview.settings.promoteCount || 0) + Number(overview.settings.relegateCount || 0)} ta jamoa kerak.`,
      409,
      "MLBB_NOT_ENOUGH_TEAMS_FOR_ZONES",
    );
  }

  const finalizationId =
    randomId();

  const nextSeason =
    getNextSeason(
      context.season,
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
    overview.standings.map(
      (team) => ({
        ...team,

        sourceLeagueTier:
          context.leagueTier,

        targetLeagueTier:
          getTargetLeagueTier(
            context.leagueTier,
            team.zone,
          ),

        nextSeason,
        zoneFinal: true,
      }),
    );

  const statements = [
    makeStatement(
      database,
      `
        INSERT INTO mlbb_finalizations (
          id,
          season,
          next_season,
          league_tier,
          team_count,
          promote_count,
          relegate_count,
          completed_rounds,
          finalized_by,
          finalized_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        finalizationId,
        context.season,
        nextSeason,
        context.leagueTier,
        finalizedStandings.length,
        Number(
          overview.settings
            .promoteCount ||
          0,
        ),
        Number(
          overview.settings
            .relegateCount ||
          0,
        ),
        Number(
          overview.fairness
            .completedRounds ||
          0,
        ),
        adminName,
        now,
      ],
    ),
  ];

  for (
    const teamChunk of
    chunkArray(
      finalizedStandings,
      6,
    )
  ) {
    const placeholders =
      teamChunk.map(
        () =>
          "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        context.leagueTier,
        team.targetLeagueTier,
        team.technicalNumber,
        team.name,
        team.tag || "",
        team.played,
        team.wins,
        team.losses,
        team.mapWins,
        team.mapLosses,
        team.mapDifference,
        team.points,
      );
    }

    statements.push(
      makeStatement(
        database,
        `
          INSERT INTO mlbb_final_results (
            finalization_id,
            team_id,
            rank,
            zone,
            source_league_tier,
            target_league_tier,
            technical_number,
            team_name,
            team_tag,
            played,
            wins,
            losses,
            map_wins,
            map_losses,
            map_difference,
            points
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

  return getMlbbStandings(
    env,
    context,
  );
}

export async function getMlbbOverview(
  env,
  source = {},
) {
  return getMlbbStandings(
    env,
    source,
  );
}
