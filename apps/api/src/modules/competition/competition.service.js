import {
  randomUUID,
} from "node:crypto";

import {
  db,
} from "@liga-arena/database";

import {
  TeamServiceError,
} from "../teams/team.service.js";

const DEFAULT_SEASON = "S01";
const DEFAULT_ACTIVE_TEAMS = 25;
const DEFAULT_MAPS_PER_ROUND = 4;
const DEFAULT_PROMOTE_COUNT = 25;
const DEFAULT_RELEGATE_COUNT = 25;

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

function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeGame(value) {
  const game =
    cleanText(value).toUpperCase();

  if (
    !["PUBG", "MLBB"].includes(
      game,
    )
  ) {
    throw new TeamServiceError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_COMPETITION_GAME",
    );
  }

  return game;
}

function normalizeCompetitionType(
  value,
) {
  const competitionType =
    cleanText(
      value || "QUALIFIER",
    ).toUpperCase();

  if (
    ![
      "QUALIFIER",
      "LEAGUE",
    ].includes(competitionType)
  ) {
    throw new TeamServiceError(
      "Musobaqa turi noto‘g‘ri.",
      400,
      "INVALID_COMPETITION_TYPE",
    );
  }

  return competitionType;
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
      "INVALID_COMPETITION_LEAGUE",
    );
  }

  return leagueTier;
}

function normalizePositiveInteger(
  value,
  fieldName,
  {
    minimum = 0,
    maximum = 9999,
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
      `${fieldName} noto‘g‘ri kiritilgan.`,
      400,
      "INVALID_COMPETITION_NUMBER",
    );
  }

  return number;
}

function normalizeDivision(
  payload = {},
) {
  const season =
    cleanText(payload.season) ||
    DEFAULT_SEASON;

  const game =
    normalizeGame(payload.game);

  const leagueTier =
    normalizeLeagueTier(
      game,
      payload.leagueTier,
    );

  const competitionType =
    normalizeCompetitionType(
      payload.competitionType,
    );

  return {
    season,
    game,
    leagueTier,
    competitionType,
  };
}

function technicalOrder(
  technicalNumber,
) {
  const match =
    cleanText(
      technicalNumber,
    ).match(/(\d+)$/);

  return match
    ? Number(match[1])
    : Number.MAX_SAFE_INTEGER;
}

function calculatePlacementPoints(
  placement,
) {
  return (
    placementPoints[placement] ||
    0
  );
}

function getDivisionTeams(
  division,
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
    `)
    .all(
      division.season,
      division.game,
      division.leagueTier,
    );
}

function ensureSettings(
  division,
) {
  const now =
    new Date().toISOString();

  db.prepare(`
    INSERT OR IGNORE INTO
      competition_settings (
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
  `).run(
    division.season,
    division.game,
    division.leagueTier,
    division.competitionType,
    DEFAULT_ACTIVE_TEAMS,
    DEFAULT_MAPS_PER_ROUND,
    DEFAULT_PROMOTE_COUNT,
    DEFAULT_RELEGATE_COUNT,
    now,
  );

  return db
    .prepare(`
      SELECT
        season,
        game,
        league_tier
          AS leagueTier,

        competition_type
          AS competitionType,

        active_teams_per_round
          AS activeTeamsPerRound,

        maps_per_round
          AS mapsPerRound,

        promote_count
          AS promoteCount,

        relegate_count
          AS relegateCount,

        updated_by
          AS updatedBy,

        updated_at
          AS updatedAt

      FROM competition_settings

      WHERE
        season = ?
        AND game = ?
        AND league_tier = ?
        AND competition_type = ?
    `)
    .get(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    );
}

export function saveCompetitionSettings(
  payload = {},
) {
  const division =
    normalizeDivision(payload);

  const activeTeamsPerRound =
    normalizePositiveInteger(
      payload.activeTeamsPerRound,
      "Bir turda o‘ynaydigan jamoalar soni",
      {
        minimum: 1,
        maximum: 100,
      },
    );

  const promoteCount =
    normalizePositiveInteger(
      payload.promoteCount,
      "Yuqoriga o‘tadigan jamoalar soni",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const relegateCount =
    normalizePositiveInteger(
      payload.relegateCount,
      "Quyiga tushadigan jamoalar soni",
      {
        minimum: 0,
        maximum: 100,
      },
    );

  const adminName =
    cleanText(payload.adminName) ||
    "Liga Arena Admin";

  const now =
    new Date().toISOString();

  db.prepare(`
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
  `).run(
    division.season,
    division.game,
    division.leagueTier,
    division.competitionType,
    activeTeamsPerRound,
    promoteCount,
    relegateCount,
    adminName,
    now,
  );

  return ensureSettings(
    division,
  );
}

function getRoundHistory(
  division,
) {
  const rows = db
    .prepare(`
      SELECT
        rt.team_id AS teamId,
        rt.participation,
        r.round_number
          AS roundNumber

      FROM competition_round_teams rt

      INNER JOIN competition_rounds r
        ON r.id = rt.round_id

      WHERE
        r.season = ?
        AND r.game = ?
        AND r.league_tier = ?
        AND r.competition_type = ?
    `)
    .all(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    );

  const history = new Map();

  for (const row of rows) {
    const current =
      history.get(row.teamId) || {
        playCount: 0,
        restCount: 0,
        lastRestRound: 0,
      };

    if (
      row.participation === "REST"
    ) {
      current.restCount += 1;

      current.lastRestRound =
        Math.max(
          current.lastRestRound,
          row.roundNumber,
        );
    } else {
      current.playCount += 1;
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
  if (restCount <= 0) {
    return new Set();
  }

  const teamCount =
    teams.length;

  const rotationOffset =
    (
      (roundNumber - 1) *
      Math.max(restCount, 1)
    ) % Math.max(teamCount, 1);

  const candidates =
    teams.map((team) => {
      const teamHistory =
        history.get(team.id) || {
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
        ) % Math.max(teamCount, 1);

      return {
        ...team,
        ...teamHistory,
        rotationOrder,
      };
    });

  candidates.sort(
    (left, right) => {
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
      .slice(0, restCount)
      .map((team) => team.id),
  );
}

export function createCompetitionRound(
  payload = {},
) {
  const division =
    normalizeDivision(payload);

  const settings =
    ensureSettings(division);

  const teams =
    getDivisionTeams(division);

  if (teams.length === 0) {
    throw new TeamServiceError(
      "Ushbu ligada tasdiqlangan jamoa mavjud emas.",
      409,
      "COMPETITION_TEAMS_EMPTY",
    );
  }

  const lastRound = db
    .prepare(`
      SELECT
        MAX(round_number)
          AS lastRoundNumber

      FROM competition_rounds

      WHERE
        season = ?
        AND game = ?
        AND league_tier = ?
        AND competition_type = ?
    `)
    .get(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    );

  const roundNumber =
    Number(
      lastRound?.lastRoundNumber ||
      0,
    ) + 1;

  const activeTeamCount =
    Math.min(
      settings.activeTeamsPerRound,
      teams.length,
    );

  const restCount =
    Math.max(
      0,
      teams.length -
      activeTeamCount,
    );

  const history =
    getRoundHistory(division);

  const restTeamIds =
    chooseRestTeams({
      teams,
      history,
      restCount,
      roundNumber,
    });

  const roundId =
    randomUUID();

  const now =
    new Date().toISOString();

  const createdBy =
    cleanText(payload.adminName) ||
    "Liga Arena Admin";

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
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
    `).run(
      roundId,
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
      roundNumber,
      createdBy,
      now,
      now,
    );

    const insertTeam = db
      .prepare(`
        INSERT INTO
          competition_round_teams (
            round_id,
            team_id,
            participation,
            created_at
          )

        VALUES (?, ?, ?, ?)
      `);

    for (const team of teams) {
      insertTeam.run(
        roundId,
        team.id,
        restTeamIds.has(team.id)
          ? "REST"
          : "PLAY",
        now,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getCompetitionRound(
    roundId,
  );
}

function getRawRound(roundId) {
  return db
    .prepare(`
      SELECT *
      FROM competition_rounds
      WHERE id = ?
    `)
    .get(roundId);
}

function requireRound(roundId) {
  const round =
    getRawRound(roundId);

  if (!round) {
    throw new TeamServiceError(
      "Tur topilmadi.",
      404,
      "COMPETITION_ROUND_NOT_FOUND",
    );
  }

  return round;
}

export function getCompetitionRound(
  roundId,
) {
  const round = db
    .prepare(`
      SELECT
        id,
        season,
        game,

        league_tier
          AS leagueTier,

        competition_type
          AS competitionType,

        round_number
          AS roundNumber,

        status,

        maps_per_round
          AS mapsPerRound,

        created_by
          AS createdBy,

        created_at
          AS createdAt,

        completed_at
          AS completedAt,

        updated_at
          AS updatedAt

      FROM competition_rounds

      WHERE id = ?
    `)
    .get(roundId);

  if (!round) {
    throw new TeamServiceError(
      "Tur topilmadi.",
      404,
      "COMPETITION_ROUND_NOT_FOUND",
    );
  }

  const teams = db
    .prepare(`
      SELECT
        t.id,

        t.technical_number
          AS technicalNumber,

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
    `)
    .all(roundId);

  const mapStatement = db
    .prepare(`
      SELECT
        map_number AS mapNumber,
        placement,
        kills,

        placement_points
          AS placementPoints,

        total_points
          AS totalPoints

      FROM competition_map_results

      WHERE
        round_id = ?
        AND team_id = ?

      ORDER BY map_number ASC
    `);

  const mappedTeams =
    teams.map((team) => {
      const maps =
        mapStatement.all(
          roundId,
          team.id,
        );

      const totalKills =
        maps.reduce(
          (total, map) =>
            total + map.kills,
          0,
        );

      const totalPoints =
        maps.reduce(
          (total, map) =>
            total + map.totalPoints,
          0,
        );

      return {
        ...team,
        maps,
        totalKills,
        totalPoints,

        complete:
          team.participation === "REST" ||
          maps.length ===
            round.mapsPerRound,
      };
    });

  const playingTeams =
    mappedTeams.filter(
      (team) =>
        team.participation === "PLAY",
    );

  const restTeams =
    mappedTeams.filter(
      (team) =>
        team.participation === "REST",
    );

  return {
    ...round,
    teams: mappedTeams,
    playingTeams,
    restTeams,

    counts: {
      total: mappedTeams.length,
      playing: playingTeams.length,
      resting: restTeams.length,

      completed:
        playingTeams.filter(
          (team) => team.complete,
        ).length,
    },
  };
}

export function saveCompetitionTeamResults(
  roundId,
  teamId,
  payload = {},
) {
  const round =
    requireRound(roundId);

  const assignment = db
    .prepare(`
      SELECT participation

      FROM competition_round_teams

      WHERE
        round_id = ?
        AND team_id = ?
    `)
    .get(
      roundId,
      teamId,
    );

  if (!assignment) {
    throw new TeamServiceError(
      "Jamoa ushbu turga biriktirilmagan.",
      404,
      "ROUND_TEAM_NOT_FOUND",
    );
  }

  if (
    assignment.participation !==
    "PLAY"
  ) {
    throw new TeamServiceError(
      "Dam olayotgan jamoaga natija kiritib bo‘lmaydi.",
      409,
      "REST_TEAM_RESULTS_FORBIDDEN",
    );
  }

  const maps =
    Array.isArray(payload.maps)
      ? payload.maps
      : [];

  if (
    maps.length !==
    round.maps_per_round
  ) {
    throw new TeamServiceError(
      `Har bir tur uchun ${round.maps_per_round} ta karta natijasi kiritilishi kerak.`,
      400,
      "ROUND_MAPS_INCOMPLETE",
    );
  }

  const normalizedMaps =
    maps.map(
      (map, index) => {
        const placement =
          normalizePositiveInteger(
            map.placement,
            `${index + 1}-karta o‘rni`,
            {
              minimum: 1,
              maximum: 100,
            },
          );

        const kills =
          normalizePositiveInteger(
            map.kills,
            `${index + 1}-karta killari`,
            {
              minimum: 0,
              maximum: 999,
            },
          );

        const mapPlacementPoints =
          calculatePlacementPoints(
            placement,
          );

        return {
          mapNumber: index + 1,
          placement,
          kills,

          placementPoints:
            mapPlacementPoints,

          totalPoints:
            mapPlacementPoints +
            kills,
        };
      },
    );

  const now =
    new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      DELETE FROM
        competition_map_results

      WHERE
        round_id = ?
        AND team_id = ?
    `).run(
      roundId,
      teamId,
    );

    const insertMap = db
      .prepare(`
        INSERT INTO
          competition_map_results (
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

        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

    for (
      const map of normalizedMaps
    ) {
      insertMap.run(
        roundId,
        teamId,
        map.mapNumber,
        map.placement,
        map.kills,
        map.placementPoints,
        map.totalPoints,
        now,
        now,
      );
    }

    db.prepare(`
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
    `).run(
      now,
      roundId,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getCompetitionRound(
    roundId,
  );
}

export function completeCompetitionRound(
  roundId,
) {
  const round =
    getCompetitionRound(roundId);

  const incompleteTeams =
    round.playingTeams.filter(
      (team) => !team.complete,
    );

  if (
    incompleteTeams.length > 0
  ) {
    const teams =
      incompleteTeams
        .slice(0, 10)
        .map(
          (team) =>
            `${team.technicalNumber} — ${team.name}`,
        )
        .join(", ");

    throw new TeamServiceError(
      `Tur yakunlanmagan. Natijasi to‘liq bo‘lmagan jamoalar: ${teams}.`,
      409,
      "ROUND_RESULTS_INCOMPLETE",
    );
  }

  const now =
    new Date().toISOString();

  db.prepare(`
    UPDATE competition_rounds
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

  return getCompetitionRound(
    roundId,
  );
}

export function deleteCompetitionRound(
  roundId,
) {
  requireRound(roundId);

  db.prepare(`
    DELETE FROM competition_rounds
    WHERE id = ?
  `).run(roundId);

  return {
    id: roundId,
    deleted: true,
  };
}

function listCompetitionRounds(
  division,
) {
  return db
    .prepare(`
      SELECT
        r.id,

        r.round_number
          AS roundNumber,

        r.status,

        r.maps_per_round
          AS mapsPerRound,

        r.created_at
          AS createdAt,

        r.completed_at
          AS completedAt,

        COUNT(rt.team_id)
          AS totalTeams,

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
            WHEN rt.participation = 'PLAY'
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
    `)
    .all(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    );
}

export function getCompetitionStandings(
  payload = {},
) {
  const division =
    normalizeDivision(payload);

  const settings =
    ensureSettings(division);

  const teams =
    getDivisionTeams(division);

  const rounds =
    listCompetitionRounds(
      division,
    );

  const completedRounds =
    rounds.filter(
      (round) =>
        round.status === "COMPLETED",
    );

  const openRounds =
    rounds.filter(
      (round) =>
        round.status !== "COMPLETED",
    );

  const resultRows = db
    .prepare(`
      SELECT
        rt.team_id AS teamId,

        r.id AS roundId,

        r.round_number
          AS roundNumber,

        rt.participation,

        COALESCE(
          SUM(m.kills),
          0
        ) AS kills,

        COALESCE(
          SUM(m.total_points),
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
    `)
    .all(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    );

  const resultMap =
    new Map();

  for (const team of teams) {
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

  for (const row of resultRows) {
    const current =
      resultMap.get(row.teamId);

    if (!current) {
      continue;
    }

    if (
      row.participation === "REST"
    ) {
      current.restRounds += 1;
      continue;
    }

    current.playedRounds += 1;
    current.totalKills += row.kills;
    current.totalPoints += row.points;
    current.firstPlaces += row.firstPlaces;

    if (
      row.roundNumber >=
      current.lastRoundNumber
    ) {
      current.lastRoundNumber =
        row.roundNumber;

      current.lastRoundPoints =
        row.points;
    }
  }

  const values =
    [...resultMap.values()];

  const playedValues =
    values.map(
      (team) => team.playedRounds,
    );

  const minimumPlayed =
    playedValues.length > 0
      ? Math.min(...playedValues)
      : 0;

  const maximumPlayed =
    playedValues.length > 0
      ? Math.max(...playedValues)
      : 0;

  const playDifference =
    maximumPlayed -
    minimumPlayed;

  const allEqual =
    playDifference === 0;

  for (const team of values) {
    team.averagePoints =
      team.playedRounds > 0
        ? team.totalPoints /
          team.playedRounds
        : 0;

    team.averageKills =
      team.playedRounds > 0
        ? team.totalKills /
          team.playedRounds
        : 0;
  }

  values.sort(
    (left, right) => {
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

  const minimumTeamsForZones =
    settings.promoteCount +
    settings.relegateCount;

  const zonesAvailable =
    division.competitionType ===
      "QUALIFIER" &&
    teams.length >=
      minimumTeamsForZones;

  const fairnessReady =
    completedRounds.length > 0 &&
    openRounds.length === 0 &&
    allEqual;

  const standings =
    values.map(
      (team, index) => {
        const rank =
          index + 1;

        let zone = "";

        if (zonesAvailable) {
          if (
            rank <=
            settings.promoteCount
          ) {
            zone = "PROMOTE";
          } else if (
            rank >
            values.length -
              settings.relegateCount
          ) {
            zone = "RELEGATE";
          } else {
            zone = "STAY";
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

  const fairnessIssues = [];

  if (
    teams.length <
    minimumTeamsForZones
  ) {
    fairnessIssues.push(
      `Saralash zonalari uchun kamida ${minimumTeamsForZones} ta jamoa kerak.`,
    );
  }

  if (playDifference > 0) {
    fairnessIssues.push(
      `Jamoalarning o‘ynagan turlari orasida ${playDifference} tur farq bor.`,
    );
  }

  if (openRounds.length > 0) {
    fairnessIssues.push(
      `${openRounds.length} ta tur hali yakunlanmagan.`,
    );
  }

  return {
    division,
    settings,
    rounds,

    standings,

    fairness: {
      teamCount: teams.length,

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

      issues:
        fairnessIssues,
    },
  };
}

const pubgLeagueOrder = [
  "SOVEREIGN",
  "VANGUARD",
  "ASCENT",
];

function getNextCompetitionSeason(
  season,
) {
  const normalized =
    cleanText(season)
      .toUpperCase();

  const match =
    normalized.match(
      /^S(\d+)$/,
    );

  if (!match) {
    return `${normalized}-NEXT`;
  }

  return `S${String(
    Number(match[1]) + 1,
  ).padStart(2, "0")}`;
}

function getPubgTargetLeague(
  currentLeagueTier,
  zone,
) {
  const index =
    pubgLeagueOrder.indexOf(
      currentLeagueTier,
    );

  if (index < 0) {
    return currentLeagueTier;
  }

  if (zone === "PROMOTE") {
    return (
      pubgLeagueOrder[
        index - 1
      ] ||
      currentLeagueTier
    );
  }

  if (zone === "RELEGATE") {
    return (
      pubgLeagueOrder[
        index + 1
      ] ||
      currentLeagueTier
    );
  }

  return currentLeagueTier;
}

function getCompetitionFinalization(
  division,
) {
  return db
    .prepare(`
      SELECT
        id,
        season,

        next_season
          AS nextSeason,

        game,

        league_tier
          AS leagueTier,

        competition_type
          AS competitionType,

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
        AND game = ?
        AND league_tier = ?
        AND competition_type = ?
    `)
    .get(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    ) || null;
}

export function finalizeCompetitionSeason(
  payload = {},
) {
  const division =
    normalizeDivision(payload);

  if (
    division.game !== "PUBG" ||
    division.competitionType !==
      "QUALIFIER"
  ) {
    throw new TeamServiceError(
      "Bu yakunlash tizimi faqat PUBG saralash musobaqasi uchun ishlaydi.",
      400,
      "PUBG_FINALIZATION_ONLY",
    );
  }

  const existing =
    getCompetitionFinalization(
      division,
    );

  if (existing) {
    throw new TeamServiceError(
      "Ushbu PUBG saralashi avval yakunlangan.",
      409,
      "PUBG_COMPETITION_ALREADY_FINALIZED",
    );
  }

  const overview =
    getCompetitionStandings(
      division,
    );

  const standings =
    Array.isArray(
      overview?.standings,
    )
      ? overview.standings
      : [];

  const settings =
    overview?.settings ||
    ensureSettings(
      division,
    );

  if (standings.length === 0) {
    throw new TeamServiceError(
      "Yakunlash uchun PUBG turnir jadvali mavjud emas.",
      409,
      "PUBG_STANDINGS_EMPTY",
    );
  }

  const roundStatus = db
    .prepare(`
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
    `)
    .get(
      division.season,
      division.game,
      division.leagueTier,
      division.competitionType,
    );

  const completedRounds =
    Number(
      roundStatus?.completedRounds ||
      0,
    );

  const unfinishedRounds =
    Number(
      roundStatus?.unfinishedRounds ||
      0,
    );

  if (completedRounds === 0) {
    throw new TeamServiceError(
      "PUBG saralashini yakunlash uchun kamida bitta tugallangan tur kerak.",
      409,
      "PUBG_NO_COMPLETED_ROUNDS",
    );
  }

  if (unfinishedRounds > 0) {
    throw new TeamServiceError(
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
    throw new TeamServiceError(
      `Barcha jamoalar teng tur o‘ynamagan. Eng kam ${minimumPlayed}, eng ko‘p ${maximumPlayed}.`,
      409,
      "PUBG_PLAY_COUNT_NOT_EQUAL",
    );
  }

  const promoteCount =
    Number(
      settings.promoteCount ||
      0,
    );

  const relegateCount =
    Number(
      settings.relegateCount ||
      0,
    );

  if (
    standings.length <
    promoteCount +
      relegateCount
  ) {
    throw new TeamServiceError(
      `Promotion va relegation uchun kamida ${
        promoteCount +
        relegateCount
      } ta jamoa kerak.`,
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

  if (invalidZoneTeam) {
    throw new TeamServiceError(
      "Yakuniy promotion va relegation zonalari hali tayyor emas.",
      409,
      "PUBG_ZONES_NOT_READY",
    );
  }

  const finalizationId =
    randomUUID();

  const nextSeason =
    getNextCompetitionSeason(
      division.season,
    );

  const adminName =
    cleanText(
      payload.adminName,
    ) ||
    "Liga Arena Admin";

  const now =
    new Date().toISOString();

  db.exec(
    "BEGIN IMMEDIATE",
  );

  try {
    db.prepare(`
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
    `).run(
      finalizationId,
      division.season,
      nextSeason,
      division.game,
      division.leagueTier,
      division.competitionType,
      standings.length,
      promoteCount,
      relegateCount,
      completedRounds,
      adminName,
      now,
    );

    const insertFinalResult =
      db.prepare(`
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

        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
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

    const finalizedStandings =
      [];

    for (
      const team of
      standings
    ) {
      const targetLeagueTier =
        getPubgTargetLeague(
          division.leagueTier,
          team.zone,
        );

      insertFinalResult.run(
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
        targetLeagueTier,
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

      updateTeam.run(
        nextSeason,
        targetLeagueTier,
        now,
        team.id,
      );

      finalizedStandings.push({
        ...team,

        sourceLeagueTier:
          division.leagueTier,

        targetLeagueTier,

        nextSeason,

        zoneFinal: true,
      });
    }

    db.exec("COMMIT");

    return {
      finalization:
        getCompetitionFinalization(
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
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function getCompetitionOverview(
  payload = {},
) {
  return getCompetitionStandings(
    payload,
  );
}