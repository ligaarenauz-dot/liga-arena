import {
  db,
} from "@liga-arena/database";

const FALLBACK_SEASON = "S01";

export function getActiveSeason() {
  const row = db
    .prepare(`
      SELECT value
      FROM system_settings
      WHERE key = 'active_season'
    `)
    .get();

  const season =
    String(
      row?.value || "",
    ).trim();

  return (
    season ||
    FALLBACK_SEASON
  );
}

export function setActiveSeason(
  season,
  updatedAt =
    new Date().toISOString(),
) {
  const normalizedSeason =
    String(
      season || "",
    )
      .trim()
      .toUpperCase();

  if (!normalizedSeason) {
    throw new Error(
      "Aktiv mavsum bo‘sh bo‘lishi mumkin emas.",
    );
  }

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

    ON CONFLICT(key)
    DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(
    normalizedSeason,
    updatedAt,
  );

  return normalizedSeason;
}