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

const orderedLeagueTiers = {
  PUBG: [
    "SOVEREIGN",
    "VANGUARD",
    "ASCENT",
  ],

  MLBB: [
    "IMPERIUM",
    "ABYSSAL",
    "DAWN",
  ],
};

function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeSeason(value) {
  const season =
    cleanText(value).toUpperCase();

  if (!season) {
    throw new TeamServiceError(
      "Mavsum ko‘rsatilmagan.",
      400,
      "SEASON_REQUIRED",
    );
  }

  return season;
}

function getNextSeason(season) {
  const match =
    season.match(/^S(\d+)$/);

  if (!match) {
    return `${season}-NEXT`;
  }

  return `S${String(
    Number(match[1]) + 1,
  ).padStart(2, "0")}`;
}

function getMovement(
  game,
  sourceLeagueTier,
  targetLeagueTier,
) {
  const tiers =
    orderedLeagueTiers[game] ||
    [];

  const sourceIndex =
    tiers.indexOf(
      sourceLeagueTier,
    );

  const targetIndex =
    tiers.indexOf(
      targetLeagueTier,
    );

  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex === targetIndex
  ) {
    return "STAYED";
  }

  return targetIndex < sourceIndex
    ? "PROMOTED"
    : "RELEGATED";
}

function getExistingRollover(
  sourceSeason,
) {
  return db
    .prepare(`
      SELECT
        id,

        source_season
          AS sourceSeason,

        target_season
          AS targetSeason,

        team_count
          AS teamCount,

        promoted_count
          AS promotedCount,

        stayed_count
          AS stayedCount,

        relegated_count
          AS relegatedCount,

        activated_by
          AS activatedBy,

        activated_at
          AS activatedAt

      FROM season_rollovers

      WHERE source_season = ?
    `)
    .get(sourceSeason) || null;
}

function getRolloverTeams(
  rolloverId,
) {
  return db
    .prepare(`
      SELECT
        team_id AS teamId,

        technical_number
          AS technicalNumber,

        game,

        team_name
          AS teamName,

        team_tag
          AS teamTag,

        source_league_tier
          AS sourceLeagueTier,

        target_league_tier
          AS targetLeagueTier,

        movement

      FROM season_rollover_teams

      WHERE rollover_id = ?

      ORDER BY
        CASE movement
          WHEN 'PROMOTED' THEN 1
          WHEN 'STAYED' THEN 2
          WHEN 'RELEGATED' THEN 3
          ELSE 4
        END,

        game,
        technical_number
    `)
    .all(rolloverId);
}

export function getCurrentSeasonInfo() {
  return {
    season: getActiveSeason(),
  };
}
export function getSeasonReadiness({
  season,
} = {}) {
  const sourceSeason =
    normalizeSeason(
      season || "S01",
    );

  const existing =
    getExistingRollover(
      sourceSeason,
    );

  if (existing) {
    const teams =
      getRolloverTeams(
        existing.id,
      );

    return {
      sourceSeason:
        existing.sourceSeason,

      targetSeason:
        existing.targetSeason,

      activated: true,
      canActivate: false,

      teamCount:
        existing.teamCount,

      readyTeamCount:
        existing.teamCount,

      blockedTeamCount: 0,

      promotedCount:
        existing.promotedCount,

      stayedCount:
        existing.stayedCount,

      relegatedCount:
        existing.relegatedCount,

      activatedBy:
        existing.activatedBy,

      activatedAt:
        existing.activatedAt,

      blockedTeams: [],
      teams,
    };
  }

  const teams = db
    .prepare(`
      SELECT
        id,

        technical_number
          AS technicalNumber,

        game,
        name,
        tag,

        league_tier
          AS leagueTier,

        next_season
          AS nextSeason,

        next_league_tier
          AS nextLeagueTier

      FROM teams

      WHERE
        season = ?
        AND status = 'APPROVED'
        AND TRIM(league_tier) != ''

      ORDER BY
        game,
        league_tier,
        technical_number
    `)
    .all(sourceSeason);

  const targetSeasons =
    [
      ...new Set(
        teams
          .map(
            (team) =>
              cleanText(
                team.nextSeason,
              ),
          )
          .filter(Boolean),
      ),
    ];

  const expectedNextSeason =
    targetSeasons.length === 1
      ? targetSeasons[0]
      : getNextSeason(
          sourceSeason,
        );

  const blockedTeams =
    teams
      .filter(
        (team) =>
          !cleanText(
            team.nextSeason,
          ) ||
          !cleanText(
            team.nextLeagueTier,
          ),
      )
      .map(
        (team) => ({
          id: team.id,

          technicalNumber:
            team.technicalNumber,

          game: team.game,
          name: team.name,
          tag: team.tag,

          leagueTier:
            team.leagueTier,

          reason:
            "Keyingi mavsum liga joylashuvi hali belgilanmagan.",
        }),
      );

  const preparedTeams =
    teams
      .filter(
        (team) =>
          cleanText(
            team.nextSeason,
          ) &&
          cleanText(
            team.nextLeagueTier,
          ),
      )
      .map(
        (team) => ({
          ...team,

          movement:
            getMovement(
              team.game,
              team.leagueTier,
              team.nextLeagueTier,
            ),
        }),
      );

  const promotedCount =
    preparedTeams.filter(
      (team) =>
        team.movement ===
        "PROMOTED",
    ).length;

  const stayedCount =
    preparedTeams.filter(
      (team) =>
        team.movement ===
        "STAYED",
    ).length;

  const relegatedCount =
    preparedTeams.filter(
      (team) =>
        team.movement ===
        "RELEGATED",
    ).length;

  const sameTargetSeason =
    targetSeasons.length <= 1;

  return {
    sourceSeason,

    targetSeason:
      expectedNextSeason,

    activated: false,

    canActivate:
      teams.length > 0 &&
      blockedTeams.length === 0 &&
      sameTargetSeason,

    teamCount:
      teams.length,

    readyTeamCount:
      preparedTeams.length,

    blockedTeamCount:
      blockedTeams.length,

    promotedCount,
    stayedCount,
    relegatedCount,

    blockedTeams,

    teams:
      preparedTeams,

    issues: [
      ...(
        teams.length === 0
          ? [
              "Ushbu mavsumda tasdiqlangan liga jamoalari topilmadi.",
            ]
          : []
      ),

      ...(
        !sameTargetSeason
          ? [
              "Jamoalarda turli keyingi mavsum qiymatlari mavjud.",
            ]
          : []
      ),

      ...(
        blockedTeams.length > 0
          ? [
              `${blockedTeams.length} ta jamoaning saralashi hali yakunlanmagan.`,
            ]
          : []
      ),
    ],
  };
}

export function activateNextSeason(
  payload = {},
) {
  const sourceSeason =
    normalizeSeason(
      payload.season || "S01",
    );

  if (
    getExistingRollover(
      sourceSeason,
    )
  ) {
    throw new TeamServiceError(
      `${sourceSeason} mavsumi avval keyingi mavsumga o‘tkazilgan.`,
      409,
      "SEASON_ALREADY_ACTIVATED",
    );
  }

  const readiness =
    getSeasonReadiness({
      season: sourceSeason,
    });

  if (!readiness.canActivate) {
    const issues =
      Array.isArray(
        readiness.issues,
      ) &&
      readiness.issues.length > 0
        ? readiness.issues.join(" ")
        : "Barcha jamoalar tayyor emas.";

    throw new TeamServiceError(
      `Keyingi mavsumni ochib bo‘lmaydi. ${issues}`,
      409,
      "SEASON_NOT_READY",
    );
  }

  const adminName =
    cleanText(
      payload.adminName,
    ) ||
    "Liga Arena Admin";

  const rolloverId =
    randomUUID();

  const now =
    new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      INSERT INTO season_rollovers (
        id,
        source_season,
        target_season,
        team_count,
        promoted_count,
        stayed_count,
        relegated_count,
        activated_by,
        activated_at
      )

      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      rolloverId,
      readiness.sourceSeason,
      readiness.targetSeason,
      readiness.teamCount,
      readiness.promotedCount,
      readiness.stayedCount,
      readiness.relegatedCount,
      adminName,
      now,
    );

    const insertAudit =
      db.prepare(`
        INSERT INTO season_rollover_teams (
          rollover_id,
          team_id,
          technical_number,
          game,
          team_name,
          team_tag,
          source_league_tier,
          target_league_tier,
          movement
        )

        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

    const updateTeam =
      db.prepare(`
        UPDATE teams

        SET
          season = ?,

          league_tier = ?,

          league_assigned_at = ?,

          league_assigned_by = ?,

          next_season = '',

          next_league_tier = '',

          updated_at = ?

        WHERE id = ?
      `);

    const clearLegacyStanding =
      db.prepare(`
        DELETE FROM league_standings
        WHERE team_id = ?
      `);

    for (
      const team of
      readiness.teams
    ) {
      insertAudit.run(
        rolloverId,
        team.id,
        team.technicalNumber,
        team.game,
        team.name,
        team.tag,
        team.leagueTier,
        team.nextLeagueTier,
        team.movement,
      );

      clearLegacyStanding.run(
        team.id,
      );

      updateTeam.run(
        readiness.targetSeason,
        team.nextLeagueTier,
        now,
        adminName,
        now,
        team.id,
      );
    }

    /*
     * LIGA_ARENA_ACTIVE_SEASON_UPDATE_V1
     *
     * Barcha jamoalar muvaffaqiyatli o‘tkazilgach,
     * platformaning aktiv mavsumini ham yangilaydi.
     */
    db.prepare(`
      INSERT INTO system_settings (
        key,
        value,
        updated_at
      )

      VALUES (
        'active_season',
        ?,
        ?
      )

      ON CONFLICT (key)

      DO UPDATE SET
        value =
          excluded.value,

        updated_at =
          excluded.updated_at
    `).run(
      readiness.targetSeason,
      now,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getSeasonReadiness({
    season: sourceSeason,
  });
}