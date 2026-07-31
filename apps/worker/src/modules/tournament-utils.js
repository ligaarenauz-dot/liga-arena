import {
  ApiError,
} from "../lib/http.js";

import {
  queryAll,
  queryFirst,
  requireDatabase,
} from "../lib/database.js";

export const DEFAULT_SEASON = "S01";

export const LEAGUE_TIERS = Object.freeze({
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
});

export function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

export function inputValue(
  source,
  key,
  fallback = undefined,
) {
  if (
    source &&
    typeof source.get === "function"
  ) {
    const value =
      source.get(key);

    return value === null
      ? fallback
      : value;
  }

  if (
    source &&
    Object.prototype.hasOwnProperty.call(
      source,
      key,
    )
  ) {
    return source[key];
  }

  return fallback;
}

export function normalizeSeason(
  value,
  fallback = DEFAULT_SEASON,
) {
  const season =
    cleanText(value)
      .toUpperCase();

  return season ||
    cleanText(fallback)
      .toUpperCase() ||
    DEFAULT_SEASON;
}

export function normalizeGame(
  value,
  code = "INVALID_GAME",
) {
  const game =
    cleanText(value)
      .toUpperCase();

  if (
    game !== "PUBG" &&
    game !== "MLBB"
  ) {
    throw new ApiError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      code,
    );
  }

  return game;
}

export function normalizeLeagueTier(
  game,
  value,
  {
    allowEmpty = false,
    code =
      "INVALID_LEAGUE_TIER",
  } = {},
) {
  const leagueTier =
    cleanText(value)
      .toUpperCase();

  if (
    allowEmpty &&
    !leagueTier
  ) {
    return "";
  }

  if (
    !LEAGUE_TIERS[
      game
    ]?.includes(
      leagueTier,
    )
  ) {
    throw new ApiError(
      "Liga darajasi tanlangan o‘yinga mos emas.",
      400,
      code,
    );
  }

  return leagueTier;
}

export function normalizeInteger(
  value,
  fieldName,
  {
    minimum = 0,
    maximum = 999999,
    code =
      "INVALID_NUMBER",
  } = {},
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    throw new ApiError(
      `${fieldName} noto‘g‘ri kiritilgan.`,
      400,
      code,
    );
  }

  return number;
}

export function randomId() {
  return crypto.randomUUID();
}

export function technicalOrder(
  technicalNumber,
) {
  const match =
    cleanText(
      technicalNumber,
    ).match(
      /(\d+)$/,
    );

  return match
    ? Number(match[1])
    : Number.MAX_SAFE_INTEGER;
}

export function getNextSeason(
  season,
) {
  const normalized =
    normalizeSeason(
      season,
    );

  const match =
    normalized.match(
      /^S(\d+)$/,
    );

  if (!match) {
    return `${normalized}-NEXT`;
  }

  return `S${String(
    Number(match[1]) + 1,
  ).padStart(
    2,
    "0",
  )}`;
}

export function bindStatement(
  database,
  sql,
  parameters = [],
) {
  const prepared =
    database.prepare(sql);

  return parameters.length > 0
    ? prepared.bind(
        ...parameters,
      )
    : prepared;
}

export async function execute(
  database,
  sql,
  parameters = [],
) {
  return bindStatement(
    database,
    sql,
    parameters,
  ).run();
}

export function makeStatement(
  database,
  sql,
  parameters = [],
) {
  return bindStatement(
    database,
    sql,
    parameters,
  );
}

export async function executeBatch(
  database,
  statements,
) {
  if (
    !Array.isArray(
      statements,
    ) ||
    statements.length === 0
  ) {
    return [];
  }

  return database.batch(
    statements,
  );
}

export async function getActiveSeason(
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
        LIMIT 1
      `,
    );

  return normalizeSeason(
    row?.value,
  );
}

export {
  ApiError,
  queryAll,
  queryFirst,
  requireDatabase,
};
