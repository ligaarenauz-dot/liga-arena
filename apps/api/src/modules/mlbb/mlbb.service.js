import {
  randomUUID,
} from "node:crypto";

import {
  db,
} from "@liga-arena/database";

import {
  getActiveSeason,
} from "../../lib/season-context.js";

import {
  TeamServiceError,
} from "../teams/team.service.js";

const leagueTiers = new Set([
  "IMPERIUM",
  "ABYSSAL",
  "DAWN",
]);

const orderedLeagueTiers = [
  "IMPERIUM",
  "ABYSSAL",
  "DAWN",
];

function getNextSeason(
  season,
) {
  const match =
    cleanText(season)
      .toUpperCase()
      .match(/^S(\d+)$/);

  if (!match) {
    return `${season}-NEXT`;
  }

  return `S${String(
    Number(match[1]) + 1,
  ).padStart(2, "0")}`;
}

function getTargetLeagueTier(
  currentLeagueTier,
  zone,
) {
  const index =
    orderedLeagueTiers.indexOf(
      currentLeagueTier,
    );

  if (index < 0) {
    return currentLeagueTier;
  }

  if (zone === "PROMOTE") {
    return (
      orderedLeagueTiers[
        index - 1
      ] ||
      currentLeagueTier
    );
  }

  if (zone === "RELEGATE") {
    return (
      orderedLeagueTiers[
        index + 1
      ] ||
      currentLeagueTier
    );
  }

  return currentLeagueTier;
}

function getMlbbFinalization(
  context,
) {
  return db
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
      context.season,
      context.leagueTier,
    ) || null;
}

function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeSeason(value) {
  return (
    cleanText(value).toUpperCase() ||
    getActiveSeason()
  );
}

function normalizeLeagueTier(value) {
  const leagueTier =
    cleanText(value).toUpperCase();

  if (
    !leagueTiers.has(
      leagueTier,
    )
  ) {
    throw new TeamServiceError(
      "MLBB liga darajasi noto‘g‘ri.",
      400,
      "INVALID_MLBB_LEAGUE",
    );
  }

  return leagueTier;
}

function normalizePositiveInteger(
  value,
  fieldName,
  {
    minimum = 0,
    maximum = 999,
  } = {},
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw new TeamServiceError(
      `${fieldName} noto‘g‘ri.`,
      400,
      "INVALID_MLBB_NUMBER",
    );
  }

  return number;
}

function normalizeContext(
  payload = {},
) {
  return {
    season:
      normalizeSeason(
        payload.season,
      ),

    leagueTier:
      normalizeLeagueTier(
        payload.leagueTier,
      ),
  };
}

function ensureSettings(
  context,
) {
  const now =
    new Date().toISOString();

  db.prepare(`
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
  `).run(
    context.season,
    context.leagueTier,
    now,
  );

  return db
    .prepare(`
      SELECT
        season,

        league_tier
          AS leagueTier,

        best_of
          AS bestOf,

        win_points
          AS winPoints,

        loss_points
          AS lossPoints,

                promote_count
          AS promoteCount,

        relegate_count
          AS relegateCount,

        updated_by
          AS updatedBy,

        updated_at
          AS updatedAt

      FROM mlbb_settings

      WHERE
        season = ?
        AND league_tier = ?
    `)
    .get(
      context.season,
      context.leagueTier,
    );
}

export function saveMlbbSettings(
  payload = {},
) {
  const context =
    normalizeContext(payload);

  if (
    getMlbbFinalization(
      context,
    )
  ) {
    throw new TeamServiceError(
      "MLBB mavsumi yakunlangan. Sozlamalarni o‘zgartirib bo‘lmaydi.",
      409,
      "MLBB_SETTINGS_FINALIZED",
    );
  }

  const bestOf =
    normalizePositiveInteger(
      payload.bestOf ?? 3,
      "Best Of",
      {
        minimum: 1,
        maximum: 9,
      },
    );

  if (bestOf % 2 === 0) {
    throw new TeamServiceError(
      "Best Of toq son bo‘lishi kerak.",
      400,
      "MLBB_BEST_OF_MUST_BE_ODD",
    );
  }

  const winPoints =
    normalizePositiveInteger(
      payload.winPoints ?? 3,
      "G‘alaba bali",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const lossPoints =
    normalizePositiveInteger(
      payload.lossPoints ?? 0,
      "Mag‘lubiyat bali",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const promoteCount =
    normalizePositiveInteger(
      payload.promoteCount ?? 25,
      "Yuqoriga o‘tadigan jamoalar",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const relegateCount =
    normalizePositiveInteger(
      payload.relegateCount ?? 25,
      "Quyiga tushadigan jamoalar",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const adminName =
    cleanText(
      payload.adminName,
    ) ||
    "Liga Arena Admin";

  const now =
    new Date().toISOString();

  db.prepare(`
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
  `).run(
    context.season,
    context.leagueTier,
    bestOf,
    winPoints,
    lossPoints,
    promoteCount,
    relegateCount,
    adminName,
    now,
  );

  return ensureSettings(
    context,
  );
}
function getApprovedTeams(
  context,
) {
  return db
    .prepare(`
      SELECT
        id,

        technical_number
          AS technicalNumber,

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
    `)
    .all(
      context.season,
      context.leagueTier,
    );
}

function ensureRoster(
  context,
) {
  const existingRoster = db
    .prepare(`
      SELECT
        r.team_id AS id,
        r.seed_order AS seedOrder,

        t.technical_number
          AS technicalNumber,

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
    `)
    .all(
      context.season,
      context.leagueTier,
    );

  if (
    existingRoster.length > 0
  ) {
    return existingRoster;
  }

  const teams =
    getApprovedTeams(
      context,
    );

  if (teams.length < 2) {
    throw new TeamServiceError(
      "MLBB ligasini boshlash uchun kamida 2 ta tasdiqlangan jamoa kerak.",
      409,
      "MLBB_NOT_ENOUGH_TEAMS",
    );
  }

  const now =
    new Date().toISOString();

  const insert =
    db.prepare(`
      INSERT INTO mlbb_league_roster (
        season,
        league_tier,
        team_id,
        seed_order,
        created_at
      )

      VALUES (?, ?, ?, ?, ?)
    `);

  db.exec("BEGIN IMMEDIATE");

  try {
    teams.forEach(
      (team, index) => {
        insert.run(
          context.season,
          context.leagueTier,
          team.id,
          index + 1,
          now,
        );
      },
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return teams.map(
    (team, index) => ({
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
    [...teams];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    if (result.length <= 2) {
      break;
    }

    result = [
      result[0],
      result[
        result.length - 1
      ],
      ...result.slice(
        1,
        result.length - 1,
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
      (team) => team.id,
    );

  if (
    participants.length % 2 !== 0
  ) {
    participants.push(null);
  }

  const totalRounds =
    participants.length - 1;

  if (
    roundNumber >
    totalRounds
  ) {
    throw new TeamServiceError(
      "Round-robin siklidagi barcha turlar yaratilgan.",
      409,
      "MLBB_ALL_ROUNDS_CREATED",
    );
  }

  const rotated =
    rotateTeams(
      participants,
      roundNumber - 1,
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

    if (!teamA || !teamB) {
      byeTeamId =
        teamA || teamB;

      continue;
    }

    pairings.push({
      teamAId: teamA,
      teamBId: teamB,
    });
  }

  return {
    pairings,
    byeTeamId,
    totalRounds,
  };
}

function getLastRoundNumber(
  context,
) {
  const row = db
    .prepare(`
      SELECT
        MAX(round_number)
          AS lastRoundNumber

      FROM mlbb_rounds

      WHERE
        season = ?
        AND league_tier = ?
    `)
    .get(
      context.season,
      context.leagueTier,
    );

  return Number(
    row?.lastRoundNumber || 0,
  );
}

export function createMlbbRound(
  payload = {},
) {
  const context =
    normalizeContext(payload);

  const settings =
    ensureSettings(context);

  if (
    getMlbbFinalization(
      context,
    )
  ) {
    throw new TeamServiceError(
      "MLBB mavsumi yakunlangan. Yangi tur yaratib bo‘lmaydi.",
      409,
      "MLBB_SEASON_FINALIZED_ROUND",
    );
  }

  const roster =
    ensureRoster(context);

  const roundNumber =
    getLastRoundNumber(
      context,
    ) + 1;

  const schedule =
    buildRoundPairings(
      roster,
      roundNumber,
    );

  const roundId =
    randomUUID();

  const now =
    new Date().toISOString();

  const promoteCount =
    normalizePositiveInteger(
      payload.promoteCount ?? 25,
      "Yuqoriga o‘tadigan jamoalar",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const relegateCount =
    normalizePositiveInteger(
      payload.relegateCount ?? 25,
      "Quyiga tushadigan jamoalar",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const adminName =
    cleanText(
      payload.adminName,
    ) ||
    "Liga Arena Admin";

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
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
    `).run(
      roundId,
      context.season,
      context.leagueTier,
      roundNumber,
      settings.bestOf,
      adminName,
      now,
      now,
    );

    const insertMatch =
      db.prepare(`
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

        VALUES (
          ?, ?, ?, ?,
          NULL,
          NULL,
          NULL,
          'PENDING',
          ?,
          ?
        )
      `);

    for (
      const pairing of
      schedule.pairings
    ) {
      insertMatch.run(
        randomUUID(),
        roundId,
        pairing.teamAId,
        pairing.teamBId,
        now,
        now,
      );
    }

    if (schedule.byeTeamId) {
      db.prepare(`
        INSERT INTO mlbb_round_byes (
          round_id,
          team_id,
          created_at
        )

        VALUES (?, ?, ?)
      `).run(
        roundId,
        schedule.byeTeamId,
        now,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getMlbbRound(
    roundId,
  );
}

function requireRound(roundId) {
  const round = db
    .prepare(`
      SELECT *
      FROM mlbb_rounds
      WHERE id = ?
    `)
    .get(roundId);

  if (!round) {
    throw new TeamServiceError(
      "MLBB turi topilmadi.",
      404,
      "MLBB_ROUND_NOT_FOUND",
    );
  }

  return round;
}

export function getMlbbRound(
  roundId,
) {
  const round = db
    .prepare(`
      SELECT
        id,
        season,

        league_tier
          AS leagueTier,

        round_number
          AS roundNumber,

        status,

        best_of
          AS bestOf,

        created_by
          AS createdBy,

        created_at
          AS createdAt,

        completed_at
          AS completedAt,

        updated_at
          AS updatedAt

      FROM mlbb_rounds

      WHERE id = ?
    `)
    .get(roundId);

  if (!round) {
    throw new TeamServiceError(
      "MLBB turi topilmadi.",
      404,
      "MLBB_ROUND_NOT_FOUND",
    );
  }

  const matches = db
    .prepare(`
      SELECT
        m.id,

        m.team_a_id
          AS teamAId,

        a.technical_number
          AS teamATechnicalNumber,

        a.name
          AS teamAName,

        a.tag
          AS teamATag,

        a.logo_url
          AS teamALogoUrl,

        m.team_b_id
          AS teamBId,

        b.technical_number
          AS teamBTechnicalNumber,

        b.name
          AS teamBName,

        b.tag
          AS teamBTag,

        b.logo_url
          AS teamBLogoUrl,

        m.score_a
          AS scoreA,

        m.score_b
          AS scoreB,

        m.winner_team_id
          AS winnerTeamId,

        m.status

      FROM mlbb_matches m

      INNER JOIN teams a
        ON a.id = m.team_a_id

      INNER JOIN teams b
        ON b.id = m.team_b_id

      WHERE m.round_id = ?

      ORDER BY
        a.technical_number ASC
    `)
    .all(roundId);

  const byeTeam = db
    .prepare(`
      SELECT
        t.id,

        t.technical_number
          AS technicalNumber,

        t.name,
        t.tag

      FROM mlbb_round_byes b

      INNER JOIN teams t
        ON t.id = b.team_id

      WHERE b.round_id = ?
    `)
    .get(roundId) || null;

  return {
    ...round,

    matches,
    byeTeam,

    counts: {
      matches:
        matches.length,

      completed:
        matches.filter(
          (match) =>
            match.status ===
            "COMPLETED",
        ).length,
    },
  };
}

export function saveMlbbMatchResult(
  matchId,
  payload = {},
) {
  const match = db
    .prepare(`
      SELECT
        m.*,
        r.best_of AS bestOf,
        r.id AS roundId,
        r.status AS roundStatus

      FROM mlbb_matches m

      INNER JOIN mlbb_rounds r
        ON r.id = m.round_id

      WHERE m.id = ?
    `)
    .get(matchId);

  if (!match) {
    throw new TeamServiceError(
      "MLBB uchrashuvi topilmadi.",
      404,
      "MLBB_MATCH_NOT_FOUND",
    );
  }

  if (
    match.roundStatus ===
    "COMPLETED"
  ) {
    throw new TeamServiceError(
      "Yakunlangan tur natijasini o‘zgartirib bo‘lmaydi.",
      409,
      "MLBB_ROUND_ALREADY_COMPLETED",
    );
  }

  const scoreA =
    normalizePositiveInteger(
      payload.scoreA,
      "Birinchi jamoa hisobi",
      {
        minimum: 0,
        maximum: 9,
      },
    );

  const scoreB =
    normalizePositiveInteger(
      payload.scoreB,
      "Ikkinchi jamoa hisobi",
      {
        minimum: 0,
        maximum: 9,
      },
    );

  const requiredWins =
    Math.floor(
      match.bestOf / 2,
    ) + 1;

  const valid =
    (
      scoreA === requiredWins &&
      scoreB < requiredWins
    ) ||
    (
      scoreB === requiredWins &&
      scoreA < requiredWins
    );

  if (!valid) {
    throw new TeamServiceError(
      `BO${match.bestOf} uchun hisob ${requiredWins}-0, ${requiredWins}-1 kabi yakuniy hisob bo‘lishi kerak.`,
      400,
      "INVALID_MLBB_SERIES_SCORE",
    );
  }

  const winnerTeamId =
    scoreA > scoreB
      ? match.team_a_id
      : match.team_b_id;

  const now =
    new Date().toISOString();

  db.prepare(`
    UPDATE mlbb_matches

    SET
      score_a = ?,
      score_b = ?,
      winner_team_id = ?,
      status = 'COMPLETED',
      updated_at = ?

    WHERE id = ?
  `).run(
    scoreA,
    scoreB,
    winnerTeamId,
    now,
    matchId,
  );

  db.prepare(`
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
  `).run(
    now,
    match.roundId,
  );

  return getMlbbRound(
    match.roundId,
  );
}

export function completeMlbbRound(
  roundId,
) {
  const round =
    getMlbbRound(roundId);

  if (
    round.counts.completed !==
    round.counts.matches
  ) {
    throw new TeamServiceError(
      `${round.counts.matches - round.counts.completed} ta uchrashuv natijasi hali kiritilmagan.`,
      409,
      "MLBB_ROUND_INCOMPLETE",
    );
  }

  const now =
    new Date().toISOString();

  db.prepare(`
    UPDATE mlbb_rounds

    SET
      status = 'COMPLETED',
      completed_at = ?,
      updated_at = ?

    WHERE id = ?
  `).run(
    now,
    now,
    roundId,
  );

  return getMlbbRound(
    roundId,
  );
}

export function deleteMlbbRound(
  roundId,
) {
  requireRound(roundId);

  db.prepare(`
    DELETE FROM mlbb_rounds
    WHERE id = ?
  `).run(roundId);

  return {
    id: roundId,
    deleted: true,
  };
}

function listRounds(
  context,
) {
  return db
    .prepare(`
      SELECT
        r.id,

        r.round_number
          AS roundNumber,

        r.status,

        r.best_of
          AS bestOf,

        COUNT(m.id)
          AS matches,

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
    `)
    .all(
      context.season,
      context.leagueTier,
    );
}

function getFinalizedMlbbStandings(
  context,
  settings,
  finalization,
) {
  const standings = db
    .prepare(`
      SELECT
        team_id AS id,

        technical_number
          AS technicalNumber,

        team_name AS name,
        team_tag AS tag,

        rank,
        zone,

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
    .all(
      finalization.id,
    )
    .map(
      (team) => ({
        ...team,
        zoneFinal: true,
      }),
    );

  const rounds =
    listRounds(context);

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
        finalization.completedRounds,

      totalRounds:
        finalization.completedRounds,

      remainingRounds: 0,

      minimumPlayed:
        standings.length > 0
          ? Math.min(
              ...standings.map(
                (team) =>
                  team.played,
              ),
            )
          : 0,

      maximumPlayed:
        standings.length > 0
          ? Math.max(
              ...standings.map(
                (team) =>
                  team.played,
              ),
            )
          : 0,

      playDifference: 0,

      seasonComplete: true,
      rosterLocked: true,
      finalized: true,
      canFinalize: true,
    },
  };
}
export function getMlbbStandings(
  payload = {},
) {
  const context =
    normalizeContext(payload);

  const settings =
    ensureSettings(context);

  const existingFinalization =
    getMlbbFinalization(
      context,
    );

  if (existingFinalization) {
    return getFinalizedMlbbStandings(
      context,
      settings,
      existingFinalization,
    );
  }

  let roster = db
    .prepare(`
      SELECT
        r.team_id AS id,

        r.seed_order
          AS seedOrder,

        t.technical_number
          AS technicalNumber,

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
    `)
    .all(
      context.season,
      context.leagueTier,
    );

  if (roster.length === 0) {
    roster =
      getApprovedTeams(
        context,
      ).map(
        (team, index) => ({
          ...team,
          seedOrder:
            index + 1,
        }),
      );
  }

  const standingsMap =
    new Map();

  for (const team of roster) {
    standingsMap.set(
      team.id,
      {
        ...team,

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

  const matches = db
    .prepare(`
      SELECT
        m.team_a_id
          AS teamAId,

        m.team_b_id
          AS teamBId,

        m.score_a
          AS scoreA,

        m.score_b
          AS scoreB,

        m.winner_team_id
          AS winnerTeamId

      FROM mlbb_matches m

      INNER JOIN mlbb_rounds r
        ON r.id = m.round_id

      WHERE
        r.season = ?
        AND r.league_tier = ?
        AND r.status = 'COMPLETED'
        AND m.status = 'COMPLETED'
    `)
    .all(
      context.season,
      context.leagueTier,
    );

  for (const match of matches) {
    const teamA =
      standingsMap.get(
        match.teamAId,
      );

    const teamB =
      standingsMap.get(
        match.teamBId,
      );

    if (!teamA || !teamB) {
      continue;
    }

    teamA.played += 1;
    teamB.played += 1;

    teamA.mapWins +=
      match.scoreA;

    teamA.mapLosses +=
      match.scoreB;

    teamB.mapWins +=
      match.scoreB;

    teamB.mapLosses +=
      match.scoreA;

    if (
      match.winnerTeamId ===
      match.teamAId
    ) {
      teamA.wins += 1;
      teamB.losses += 1;

      teamA.points +=
        settings.winPoints;

      teamB.points +=
        settings.lossPoints;
    } else {
      teamB.wins += 1;
      teamA.losses += 1;

      teamB.points +=
        settings.winPoints;

      teamA.points +=
        settings.lossPoints;
    }
  }

  const byes = db
    .prepare(`
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
    `)
    .all(
      context.season,
      context.leagueTier,
    );

  for (const bye of byes) {
    const team =
      standingsMap.get(
        bye.teamId,
      );

    if (team) {
      team.restRounds =
        bye.restRounds;
    }
  }

  const standings =
    [...standingsMap.values()];

  for (const team of standings) {
    team.mapDifference =
      team.mapWins -
      team.mapLosses;
  }

  standings.sort(
    (left, right) => {
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

  const zonesAvailable =
    standings.length >=
      (
        settings.promoteCount +
        settings.relegateCount
      );

  standings.forEach(
    (team, index) => {
      team.rank =
        index + 1;

      team.zone = "";

      if (zonesAvailable) {
        if (
          team.rank <=
          settings.promoteCount
        ) {
          team.zone =
            "PROMOTE";
        } else if (
          team.rank >
          standings.length -
            settings.relegateCount
        ) {
          team.zone =
            "RELEGATE";
        } else {
          team.zone =
            "STAY";
        }
      }

      team.zoneFinal = false;
    },
  );

  const rounds =
    listRounds(context);

  const completedRounds =
    rounds.filter(
      (round) =>
        round.status ===
        "COMPLETED",
    ).length;

  const rosterSize =
    roster.length % 2 === 0
      ? roster.length
      : roster.length + 1;

  const totalRounds =
    rosterSize > 0
      ? rosterSize - 1
      : 0;

  const playedValues =
    standings.map(
      (team) => team.played,
    );

  const minimumPlayed =
    playedValues.length > 0
      ? Math.min(
          ...playedValues,
        )
      : 0;

  const maximumPlayed =
    playedValues.length > 0
      ? Math.max(
          ...playedValues,
        )
      : 0;

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

      seasonComplete:
        totalRounds > 0 &&
        completedRounds ===
          totalRounds,

      zonesAvailable,

      canFinalize:
        totalRounds > 0 &&
        completedRounds ===
          totalRounds &&
        zonesAvailable,

      finalized: false,

      rosterLocked:
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM mlbb_league_roster
          WHERE
            season = ?
            AND league_tier = ?
        `).get(
          context.season,
          context.leagueTier,
        ).count > 0,
    },
  };
}

export function finalizeMlbbSeason(
  payload = {},
) {
  const context =
    normalizeContext(payload);

  const existing =
    getMlbbFinalization(
      context,
    );

  if (existing) {
    throw new TeamServiceError(
      "Ushbu MLBB mavsumi avval yakunlangan.",
      409,
      "MLBB_ALREADY_FINALIZED",
    );
  }

  const overview =
    getMlbbStandings(
      context,
    );

  if (
    !overview.fairness
      .seasonComplete
  ) {
    throw new TeamServiceError(
      "MLBB mavsumini yakunlab bo‘lmaydi. Barcha round-robin turlari yakunlanishi kerak.",
      409,
      "MLBB_SEASON_INCOMPLETE",
    );
  }

  if (
    !overview.fairness
      .zonesAvailable
  ) {
    throw new TeamServiceError(
      `Promotion va relegation zonalari uchun kamida ${
        overview.settings.promoteCount +
        overview.settings.relegateCount
      } ta jamoa kerak.`,
      409,
      "MLBB_NOT_ENOUGH_TEAMS_FOR_ZONES",
    );
  }

  const finalizationId =
    randomUUID();

  const nextSeason =
    getNextSeason(
      context.season,
    );

  const adminName =
    cleanText(
      payload.adminName,
    ) ||
    "Liga Arena Admin";

  const now =
    new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
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
    `).run(
      finalizationId,
      context.season,
      nextSeason,
      context.leagueTier,
      overview.standings.length,
      overview.settings.promoteCount,
      overview.settings.relegateCount,
      overview.fairness.completedRounds,
      adminName,
      now,
    );

    const insertResult =
      db.prepare(`
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

        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

    const updateTeam =
      db.prepare(`
        UPDATE teams

        SET
          next_season = ?,
          next_league_tier = ?,
          updated_at = ?

        WHERE id = ?
      `);

    for (
      const team of
      overview.standings
    ) {
      const targetLeagueTier =
        getTargetLeagueTier(
          context.leagueTier,
          team.zone,
        );

      insertResult.run(
        finalizationId,
        team.id,
        team.rank,
        team.zone,
        context.leagueTier,
        targetLeagueTier,
        team.technicalNumber,
        team.name,
        team.tag,
        team.played,
        team.wins,
        team.losses,
        team.mapWins,
        team.mapLosses,
        team.mapDifference,
        team.points,
      );

      updateTeam.run(
        nextSeason,
        targetLeagueTier,
        now,
        team.id,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getMlbbStandings(
    context,
  );
}
export function getMlbbOverview(
  payload = {},
) {
  return getMlbbStandings(
    payload,
  );
}