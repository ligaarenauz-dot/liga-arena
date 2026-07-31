import {
  ApiError,
  LEAGUE_TIERS,
  cleanText,
  executeBatch,
  getActiveSeason,
  getNextSeason,
  inputValue,
  makeStatement,
  normalizeSeason,
  queryAll,
  queryFirst,
  randomId,
  requireDatabase,
} from "./tournament-utils.js";

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

function getMovement(
  game,
  sourceLeagueTier,
  targetLeagueTier,
) {
  const tiers =
    LEAGUE_TIERS[
      game
    ] || [];

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
    sourceIndex ===
      targetIndex
  ) {
    return "STAYED";
  }

  return targetIndex <
    sourceIndex
    ? "PROMOTED"
    : "RELEGATED";
}

async function getExistingRollover(
  env,
  sourceSeason,
) {
  const database =
    requireDatabase(env);

  return (
    await queryFirst(
      database,
      `
        SELECT
          id,
          source_season AS sourceSeason,
          target_season AS targetSeason,
          team_count AS teamCount,
          promoted_count AS promotedCount,
          stayed_count AS stayedCount,
          relegated_count AS relegatedCount,
          activated_by AS activatedBy,
          activated_at AS activatedAt

        FROM season_rollovers

        WHERE source_season = ?

        LIMIT 1
      `,
      [
        sourceSeason,
      ],
    )
  ) || null;
}

async function getRolloverTeams(
  env,
  rolloverId,
) {
  const database =
    requireDatabase(env);

  return queryAll(
    database,
    `
      SELECT
        team_id AS teamId,
        technical_number AS technicalNumber,
        game,
        team_name AS teamName,
        team_tag AS teamTag,
        source_league_tier AS sourceLeagueTier,
        target_league_tier AS targetLeagueTier,
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
    `,
    [
      rolloverId,
    ],
  );
}

export async function getCurrentSeason(
  env,
) {
  return {
    season:
      await getActiveSeason(
        env,
      ),
  };
}

export async function getSeasonReadiness(
  env,
  source = {},
) {
  const database =
    requireDatabase(env);

  const sourceSeason =
    normalizeSeason(
      inputValue(
        source,
        "season",
        "S01",
      ),
    );

  const existing =
    await getExistingRollover(
      env,
      sourceSeason,
    );

  if (existing) {
    const teams =
      await getRolloverTeams(
        env,
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
        Number(
          existing.teamCount ||
          0,
        ),

      readyTeamCount:
        Number(
          existing.teamCount ||
          0,
        ),

      blockedTeamCount: 0,

      promotedCount:
        Number(
          existing.promotedCount ||
          0,
        ),

      stayedCount:
        Number(
          existing.stayedCount ||
          0,
        ),

      relegatedCount:
        Number(
          existing.relegatedCount ||
          0,
        ),

      activatedBy:
        existing.activatedBy,

      activatedAt:
        existing.activatedAt,

      blockedTeams: [],
      teams,
      issues: [],
    };
  }

  const teams =
    await queryAll(
      database,
      `
        SELECT
          id,
          technical_number AS technicalNumber,
          game,
          name,
          tag,
          league_tier AS leagueTier,
          next_season AS nextSeason,
          next_league_tier AS nextLeagueTier

        FROM teams

        WHERE
          season = ?
          AND status = 'APPROVED'
          AND TRIM(
            league_tier
          ) != ''

        ORDER BY
          game,
          league_tier,
          technical_number
      `,
      [
        sourceSeason,
      ],
    );

  const targetSeasons = [
    ...new Set(
      teams
        .map(
          (team) =>
            cleanText(
              team.nextSeason,
            ),
        )
        .filter(
          Boolean,
        ),
    ),
  ];

  const expectedNextSeason =
    targetSeasons.length ===
    1
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
          id:
            team.id,

          technicalNumber:
            team.technicalNumber,

          game:
            team.game,

          name:
            team.name,

          tag:
            team.tag,

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
    targetSeasons.length <=
    1;

  const issues = [
    ...(
      teams.length ===
      0
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
      blockedTeams.length >
      0
        ? [
            `${blockedTeams.length} ta jamoaning saralashi hali yakunlanmagan.`,
          ]
        : []
    ),
  ];

  return {
    sourceSeason,

    targetSeason:
      expectedNextSeason,

    activated: false,

    canActivate:
      teams.length >
        0 &&
      blockedTeams.length ===
        0 &&
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

    issues,
  };
}

export async function activateNextSeason(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const sourceSeason =
    normalizeSeason(
      inputValue(
        payload,
        "season",
        "S01",
      ),
    );

  if (
    await getExistingRollover(
      env,
      sourceSeason,
    )
  ) {
    throw new ApiError(
      `${sourceSeason} mavsumi avval keyingi mavsumga o‘tkazilgan.`,
      409,
      "SEASON_ALREADY_ACTIVATED",
    );
  }

  const readiness =
    await getSeasonReadiness(
      env,
      {
        season:
          sourceSeason,
      },
    );

  if (
    !readiness.canActivate
  ) {
    const issues =
      Array.isArray(
        readiness.issues,
      ) &&
      readiness.issues.length >
        0
        ? readiness.issues.join(
            " ",
          )
        : "Barcha jamoalar tayyor emas.";

    throw new ApiError(
      `Keyingi mavsumni ochib bo‘lmaydi. ${issues}`,
      409,
      "SEASON_NOT_READY",
    );
  }

  const adminName =
    cleanText(
      inputValue(
        payload,
        "adminName",
        "",
      ),
    ) ||
    "Liga Arena Admin";

  const rolloverId =
    randomId();

  const now =
    new Date()
      .toISOString();

  const statements = [
    makeStatement(
      database,
      `
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
      `,
      [
        rolloverId,
        readiness.sourceSeason,
        readiness.targetSeason,
        readiness.teamCount,
        readiness.promotedCount,
        readiness.stayedCount,
        readiness.relegatedCount,
        adminName,
        now,
      ],
    ),
  ];

  for (
    const teamChunk of
    chunkArray(
      readiness.teams,
      11,
    )
  ) {
    const placeholders =
      teamChunk.map(
        () =>
          "(?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).join(", ");

    const parameters = [];

    for (
      const team of
      teamChunk
    ) {
      parameters.push(
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
    }

    statements.push(
      makeStatement(
        database,
        `
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
          VALUES ${placeholders}
        `,
        parameters,
      ),
    );
  }

  for (
    const teamChunk of
    chunkArray(
      readiness.teams,
      32,
    )
  ) {
    const caseParts = [];
    const parameters = [
      readiness.targetSeason,
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
        team.nextLeagueTier,
      );
    }

    parameters.push(
      now,
      adminName,
      now,
      ...teamChunk.map(
        (team) =>
          team.id,
      ),
    );

    const idPlaceholders =
      teamChunk.map(
        () =>
          "?",
      ).join(", ");

    statements.push(
      makeStatement(
        database,
        `
          UPDATE teams
          SET
            season = ?,
            league_tier =
              CASE id
                ${caseParts.join(
                  " ",
                )}
                ELSE league_tier
              END,
            league_assigned_at = ?,
            league_assigned_by = ?,
            next_season = '',
            next_league_tier = '',
            updated_at = ?
          WHERE id IN (
            ${idPlaceholders}
          )
        `,
        parameters,
      ),
    );

    statements.push(
      makeStatement(
        database,
        `
          DELETE FROM league_standings
          WHERE team_id IN (
            ${idPlaceholders}
          )
        `,
        teamChunk.map(
          (team) =>
            team.id,
        ),
      ),
    );
  }

  statements.push(
    makeStatement(
      database,
      `
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
      `,
      [
        readiness.targetSeason,
        now,
      ],
    ),
  );

  await executeBatch(
    database,
    statements,
  );

  return getSeasonReadiness(
    env,
    {
      season:
        sourceSeason,
    },
  );
}
