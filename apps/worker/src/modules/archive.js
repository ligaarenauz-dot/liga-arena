import {
  ApiError,
  cleanText,
  inputValue,
  normalizeGame,
  normalizeLeagueTier,
  normalizeSeason,
  queryAll,
  queryFirst,
  requireDatabase,
} from "./tournament-utils.js";

export async function listArchivedSeasons(
  env,
  source = {},
) {
  const database =
    requireDatabase(env);

  const gameValue =
    cleanText(
      inputValue(
        source,
        "game",
        "",
      ),
    );

  const game =
    gameValue
      ? normalizeGame(
          gameValue,
          "INVALID_ARCHIVE_GAME",
        )
      : "";

  const [
    pubgRows,
    mlbbRows,
  ] =
    await Promise.all([
      !game ||
      game === "PUBG"
        ? queryAll(
            database,
            `
              SELECT DISTINCT
                season
              FROM competition_finalizations
              WHERE competition_type = 'QUALIFIER'
              ORDER BY season DESC
            `,
          )
        : Promise.resolve(
            [],
          ),

      !game ||
      game === "MLBB"
        ? queryAll(
            database,
            `
              SELECT DISTINCT
                season
              FROM mlbb_finalizations
              ORDER BY season DESC
            `,
          )
        : Promise.resolve(
            [],
          ),
    ]);

  const map =
    new Map();

  for (
    const row of
    pubgRows
  ) {
    const item = {
      season:
        row.season,
      game:
        "PUBG",
    };

    map.set(
      `${item.game}:${item.season}`,
      item,
    );
  }

  for (
    const row of
    mlbbRows
  ) {
    const item = {
      season:
        row.season,
      game:
        "MLBB",
    };

    map.set(
      `${item.game}:${item.season}`,
      item,
    );
  }

  return [
    ...map.values(),
  ].sort(
    (
      left,
      right,
    ) =>
      right.season
        .localeCompare(
          left.season,
        ),
  );
}

async function getPubgArchive(
  env,
  {
    season,
    leagueTier,
  },
) {
  const database =
    requireDatabase(env);

  const finalization =
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          next_season AS nextSeason,
          game,
          league_tier AS leagueTier,
          team_count AS teamCount,
          promote_count AS promoteCount,
          relegate_count AS relegateCount,
          completed_rounds AS completedRounds,
          finalized_by AS finalizedBy,
          finalized_at AS finalizedAt

        FROM competition_finalizations

        WHERE
          season = ?
          AND game = 'PUBG'
          AND league_tier = ?
          AND competition_type = 'QUALIFIER'

        LIMIT 1
      `,
      [
        season,
        leagueTier,
      ],
    );

  if (!finalization) {
    return {
      finalization: null,
      standings: [],
    };
  }

  const standings =
    await queryAll(
      database,
      `
        SELECT
          team_id AS teamId,
          rank,
          zone,
          technical_number AS technicalNumber,
          team_name AS name,
          team_tag AS tag,
          region,
          logo_url AS logoUrl,
          source_league_tier AS sourceLeagueTier,
          target_league_tier AS targetLeagueTier,
          played_rounds AS playedRounds,
          rest_rounds AS restRounds,
          total_kills AS totalKills,
          total_points AS totalPoints,
          first_places AS firstPlaces,
          last_round_points AS lastRoundPoints

        FROM competition_final_results

        WHERE finalization_id = ?

        ORDER BY rank ASC
      `,
      [
        finalization.id,
      ],
    );

  return {
    finalization,
    standings,
  };
}

async function getMlbbArchive(
  env,
  {
    season,
    leagueTier,
  },
) {
  const database =
    requireDatabase(env);

  const finalization =
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
        season,
        leagueTier,
      ],
    );

  if (!finalization) {
    return {
      finalization: null,
      standings: [],
    };
  }

  const standings =
    await queryAll(
      database,
      `
        SELECT
          team_id AS teamId,
          rank,
          zone,
          technical_number AS technicalNumber,
          team_name AS name,
          team_tag AS tag,
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
    );

  return {
    finalization,
    standings,
  };
}

export async function getArchivedStandings(
  env,
  source = {},
) {
  const season =
    normalizeSeason(
      inputValue(
        source,
        "season",
        "",
      ),
      "",
    );

  if (
    !cleanText(
      inputValue(
        source,
        "season",
        "",
      ),
    )
  ) {
    throw new ApiError(
      "Arxiv mavsumi ko‘rsatilmagan.",
      400,
      "ARCHIVE_SEASON_REQUIRED",
    );
  }

  const game =
    normalizeGame(
      inputValue(
        source,
        "game",
        "",
      ),
      "INVALID_ARCHIVE_GAME",
    );

  const leagueTier =
    normalizeLeagueTier(
      game,
      inputValue(
        source,
        "leagueTier",
        "",
      ),
      {
        code:
          "INVALID_ARCHIVE_LEAGUE",
      },
    );

  const result =
    game === "PUBG"
      ? await getPubgArchive(
          env,
          {
            season,
            leagueTier,
          },
        )
      : await getMlbbArchive(
          env,
          {
            season,
            leagueTier,
          },
        );

  return {
    season,
    game,
    leagueTier,
    ...result,
  };
}
