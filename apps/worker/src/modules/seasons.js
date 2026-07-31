import {
  queryFirst,
  requireDatabase,
} from "../lib/database.js";

const FALLBACK_SEASON =
  "S01";

export async function getCurrentSeason(
  env,
) {
  const database =
    requireDatabase(env);

  const row =
    await queryFirst(
      database,
      `
        SELECT value
        FROM system_settings
        WHERE key = 'active_season'
      `,
    );

  const season =
    String(
      row?.value || "",
    )
      .trim()
      .toUpperCase();

  return {
    season:
      season ||
      FALLBACK_SEASON,
  };
}