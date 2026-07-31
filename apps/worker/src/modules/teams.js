import {
  ApiError,
} from "../lib/http.js";

import {
  queryAll,
  queryFirst,
  requireDatabase,
} from "../lib/database.js";

const DEFAULT_SEASON =
  "S01";

function cleanText(
  value,
) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeGame(
  value,
) {
  const game =
    cleanText(value)
      .toUpperCase();

  if (
    ![
      "PUBG",
      "MLBB",
    ].includes(game)
  ) {
    throw new ApiError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_GAME",
    );
  }

  return game;
}

function normalizeNumericId(
  value,
  fieldName,
) {
  const normalized =
    cleanText(value)
      .replace(
        /\D/g,
        "",
      );

  if (
    normalized.length < 4 ||
    normalized.length > 24
  ) {
    throw new ApiError(
      `${fieldName} noto‘g‘ri kiritilgan.`,
      400,
      "INVALID_GAME_ID",
    );
  }

  return normalized;
}

function getMinimumAge(
  env,
  game,
) {
  const variableName =
    game === "MLBB"
      ? "MLBB_MIN_AGE"
      : "PUBG_MIN_AGE";

  const configured =
    Number.parseInt(
      env?.[variableName],
      10,
    );

  return (
    Number.isInteger(
      configured,
    ) &&
    configured >= 5 &&
    configured <= 99
  )
    ? configured
    : 16;
}

function calculateAge(
  birthDate,
) {
  const normalized =
    cleanText(
      birthDate,
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    normalized
      .split("-")
      .map(Number);

  const birth =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    birth.getUTCFullYear() !==
      year ||
    birth.getUTCMonth() !==
      month - 1 ||
    birth.getUTCDate() !==
      day
  ) {
    return null;
  }

  const today =
    new Date();

  let age =
    today.getUTCFullYear() -
    year;

  const currentMonth =
    today.getUTCMonth() + 1;

  const currentDay =
    today.getUTCDate();

  if (
    currentMonth < month ||
    (
      currentMonth ===
        month &&
      currentDay < day
    )
  ) {
    age -= 1;
  }

  return age;
}

function getTeamLimits(
  game,
) {
  if (game === "PUBG") {
    return {
      main: 4,
      reserve: 2,
      total: 6,
      reserveRequired:
        false,
    };
  }

  return {
    main: 5,
    reserve: 1,
    total: 6,
    reserveRequired:
      true,
  };
}

function normalizeTeamId(
  value,
) {
  const teamId =
    cleanText(value);

  if (
    !teamId ||
    teamId.length > 200
  ) {
    throw new ApiError(
      "Jamoa ID noto‘g‘ri.",
      400,
      "INVALID_TEAM_ID",
    );
  }

  return teamId;
}

const REGIONS = [
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg‘ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Qoraqalpog‘iston Respublikasi",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
  "Toshkent viloyati",
  "Toshkent shahri",
];

function normalizeTelegramId(
  value,
  required = false,
) {
  const normalized =
    cleanText(value);

  if (
    required &&
    !normalized
  ) {
    throw new ApiError(
      "Telegram ID kiritilishi shart.",
      400,
      "TELEGRAM_ID_REQUIRED",
    );
  }

  if (
    normalized &&
    !/^\d+$/.test(normalized)
  ) {
    throw new ApiError(
      "Telegram ID faqat raqamlardan iborat bo‘lishi kerak.",
      400,
      "INVALID_TELEGRAM_ID",
    );
  }

  return normalized || null;
}

function normalizeTag(
  value,
) {
  const tag =
    cleanText(value)
      .replace(/\s+/g, "")
      .toUpperCase();

  if (
    tag.length < 2 ||
    tag.length > 8
  ) {
    throw new ApiError(
      "Jamoa TAG’i 2–8 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_TEAM_TAG",
    );
  }

  return tag;
}

function validateTeamName(
  value,
) {
  const name =
    cleanText(value);

  if (
    name.length < 3 ||
    name.length > 32
  ) {
    throw new ApiError(
      "Jamoa nomi 3–32 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_TEAM_NAME",
    );
  }

  return name;
}

function validateFullName(
  value,
) {
  const fullName =
    cleanText(value)
      .replace(/\s+/g, " ");

  if (
    fullName.length < 5 ||
    fullName.length > 100 ||
    !fullName.includes(" ")
  ) {
    throw new ApiError(
      "Ism va familiyani to‘liq kiriting.",
      400,
      "INVALID_FULL_NAME",
    );
  }

  return fullName;
}

function validateBirthDate(
  value,
  env,
  game,
) {
  const birthDate =
    cleanText(value);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      birthDate,
    )
  ) {
    throw new ApiError(
      "Tug‘ilgan sanani to‘liq kiriting.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  const [
    year,
    month,
    day,
  ] =
    birthDate
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day ||
    date > new Date()
  ) {
    throw new ApiError(
      "Tug‘ilgan sana noto‘g‘ri.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  const age =
    calculateAge(
      birthDate,
    );

  const minimumAge =
    getMinimumAge(
      env,
      game,
    );

  if (
    age <
    minimumAge
  ) {
    throw new ApiError(
      `Liga uchun minimal yosh ${minimumAge}. O‘yinchi hozir ${age} yoshda.`,
      409,
      "PLAYER_UNDERAGE",
    );
  }

  if (age > 100) {
    throw new ApiError(
      "Tug‘ilgan sana haqiqiy emas.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  return birthDate;
}

function validateRegion(
  value,
) {
  const region =
    cleanText(value);

  if (
    !REGIONS.includes(
      region,
    )
  ) {
    throw new ApiError(
      "Yashash viloyatini ro‘yxatdan tanlang.",
      400,
      "INVALID_REGION",
    );
  }

  return region;
}

function normalizePhone(
  value,
) {
  const digits =
    cleanText(value)
      .replace(/\D/g, "");

  let normalized = "";

  if (
    digits.length === 12 &&
    digits.startsWith("998")
  ) {
    normalized =
      `+${digits}`;
  } else if (
    digits.length === 9
  ) {
    normalized =
      `+998${digits}`;
  }

  if (
    !/^\+998\d{9}$/.test(
      normalized,
    )
  ) {
    throw new ApiError(
      "Telefon raqamini +998901234567 formatida kiriting.",
      400,
      "INVALID_PHONE",
    );
  }

  return normalized;
}

function validateNickname(
  value,
) {
  const nickname =
    cleanText(value);

  if (
    nickname.length < 2 ||
    nickname.length > 32
  ) {
    throw new ApiError(
      "O‘yinchi nickname’i 2–32 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_NICKNAME",
    );
  }

  return nickname;
}

async function ensureUniquePlayer(
  database,
  {
    season,
    game,
    gameUserId,
    serverId,
    telegramId,
  },
) {
  const existingGameId =
    await queryFirst(
      database,
      `
        SELECT
          tm.id,

          t.name
            AS "teamName"

        FROM team_members tm

        JOIN teams t
          ON t.id =
            tm.team_id

        WHERE
          tm.season = ?
          AND tm.game = ?
          AND tm.game_user_id = ?
          AND tm.server_id = ?

        LIMIT 1
      `,
      [
        season,
        game,
        gameUserId,
        serverId,
      ],
    );

  if (existingGameId) {
    throw new ApiError(
      `Bu o‘yin ID allaqachon "${existingGameId.teamName}" jamoasida ro‘yxatdan o‘tgan.`,
      409,
      "DUPLICATE_GAME_ID",
    );
  }

  if (!telegramId) {
    return;
  }

  const existingTelegram =
    await queryFirst(
      database,
      `
        SELECT
          tm.id,

          t.name
            AS "teamName"

        FROM team_members tm

        JOIN teams t
          ON t.id =
            tm.team_id

        WHERE
          tm.season = ?
          AND tm.game = ?
          AND tm.telegram_id = ?

        LIMIT 1
      `,
      [
        season,
        game,
        telegramId,
      ],
    );

  if (existingTelegram) {
    throw new ApiError(
      `Bu Telegram foydalanuvchisi allaqachon "${existingTelegram.teamName}" jamoasida ro‘yxatdan o‘tgan.`,
      409,
      "DUPLICATE_TELEGRAM_USER",
    );
  }
}

function throwCreateDatabaseError(
  error,
) {
  if (
    error instanceof
    ApiError
  ) {
    throw error;
  }

  const message =
    cleanText(
      error?.message,
    ).toLowerCase();

  if (
    message.includes(
      "teams.season",
    ) &&
    message.includes(
      "teams.game",
    ) &&
    message.includes(
      "teams.name",
    )
  ) {
    throw new ApiError(
      "Bu nomdagi jamoa ushbu ligada allaqachon mavjud.",
      409,
      "DUPLICATE_TEAM_NAME",
    );
  }

  if (
    message.includes(
      "teams.season",
    ) &&
    message.includes(
      "teams.game",
    ) &&
    message.includes(
      "teams.tag",
    )
  ) {
    throw new ApiError(
      "Bu TAG boshqa jamoa tomonidan ishlatilmoqda.",
      409,
      "DUPLICATE_TEAM_TAG",
    );
  }

  if (
    message.includes(
      "team_members.season",
    ) &&
    message.includes(
      "team_members.game",
    ) &&
    message.includes(
      "team_members.game_user_id",
    )
  ) {
    throw new ApiError(
      "Bu o‘yin ID allaqachon boshqa jamoada ro‘yxatdan o‘tgan.",
      409,
      "DUPLICATE_GAME_ID",
    );
  }

  if (
    message.includes(
      "team_members.season",
    ) &&
    message.includes(
      "team_members.game",
    ) &&
    message.includes(
      "team_members.telegram_id",
    )
  ) {
    throw new ApiError(
      "Bu Telegram foydalanuvchisi allaqachon boshqa jamoada ro‘yxatdan o‘tgan.",
      409,
      "DUPLICATE_TELEGRAM_USER",
    );
  }

  throw error;
}

export async function checkGameId(
  env,
  searchParams,
) {
  const database =
    requireDatabase(env);

  const game =
    normalizeGame(
      searchParams.get(
        "game",
      ),
    );

  const season =
    cleanText(
      searchParams.get(
        "season",
      ),
    ) || DEFAULT_SEASON;

  const gameUserId =
    normalizeNumericId(
      searchParams.get(
        "gameUserId",
      ),
      "O‘yin ID",
    );

  const serverId =
    game === "MLBB"
      ? normalizeNumericId(
          searchParams.get(
            "serverId",
          ),
          "Server ID",
        )
      : "";

  const existingMember =
    await queryFirst(
      database,
      `
        SELECT
          tm.id,

          t.name
            AS "teamName"

        FROM team_members tm

        JOIN teams t
          ON t.id =
            tm.team_id

        WHERE
          tm.season = ?
          AND tm.game = ?
          AND tm.game_user_id = ?
          AND tm.server_id = ?

        LIMIT 1
      `,
      [
        season,
        game,
        gameUserId,
        serverId,
      ],
    );

  return {
    exists:
      Boolean(
        existingMember,
      ),

    available:
      !existingMember,
  };
}

export async function createTeam(
  env,
  payload = {},
) {
  const database =
    requireDatabase(env);

  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(payload)
  ) {
    throw new ApiError(
      "So‘rov ma’lumotlari noto‘g‘ri.",
      400,
      "INVALID_JSON_BODY",
    );
  }

  const game =
    normalizeGame(
      payload.game,
    );

  const season =
    cleanText(
      payload.season,
    ) || DEFAULT_SEASON;

  const name =
    validateTeamName(
      payload.name,
    );

  const tag =
    normalizeTag(
      payload.tag,
    );

  const logoUrl =
    cleanText(
      payload.logoUrl,
    );

  if (!logoUrl) {
    throw new ApiError(
      "Jamoa logotipini yuklang.",
      400,
      "TEAM_LOGO_REQUIRED",
    );
  }

  const captain =
    payload.captain ??
    {};

  const telegramId =
    normalizeTelegramId(
      captain.telegramId,
      true,
    );

  const fullName =
    validateFullName(
      captain.fullName,
    );

  const birthDate =
    validateBirthDate(
      captain.birthDate,
      env,
      game,
    );

  const region =
    validateRegion(
      captain.region ||
        payload.region,
    );

  const phone =
    normalizePhone(
      captain.phone,
    );

  const gameUserId =
    normalizeNumericId(
      captain.gameUserId,

      game === "PUBG"
        ? "PUBG ID"
        : "Mobile Legends User ID",
    );

  const serverId =
    game === "MLBB"
      ? normalizeNumericId(
          captain.serverId,
          "Server / Zone ID",
        )
      : "";

  const nickname =
    validateNickname(
      captain.nickname,
    );

  const username =
    cleanText(
      captain.username,
    ).replace(
      /^@/,
      "",
    );

  const mediaConsent =
    payload.mediaConsent ===
    true;

  const rulesConsent =
    payload.rulesConsent ===
    true;

  if (!mediaConsent) {
    throw new ApiError(
      "Surat va videolardan foydalanish roziligini tasdiqlang.",
      400,
      "MEDIA_CONSENT_REQUIRED",
    );
  }

  if (!rulesConsent) {
    throw new ApiError(
      "Liga reglamenti va shartlariga rozilikni tasdiqlang.",
      400,
      "RULES_CONSENT_REQUIRED",
    );
  }

  const existingName =
    await queryFirst(
      database,
      `
        SELECT id
        FROM teams
        WHERE
          season = ?
          AND game = ?
          AND name = ?
        LIMIT 1
      `,
      [
        season,
        game,
        name,
      ],
    );

  if (existingName) {
    throw new ApiError(
      "Bu nomdagi jamoa ushbu ligada allaqachon mavjud.",
      409,
      "DUPLICATE_TEAM_NAME",
    );
  }

  const existingTag =
    await queryFirst(
      database,
      `
        SELECT id
        FROM teams
        WHERE
          season = ?
          AND game = ?
          AND tag = ?
        LIMIT 1
      `,
      [
        season,
        game,
        tag,
      ],
    );

  if (existingTag) {
    throw new ApiError(
      "Bu TAG boshqa jamoa tomonidan ishlatilmoqda.",
      409,
      "DUPLICATE_TEAM_TAG",
    );
  }

  await ensureUniquePlayer(
    database,
    {
      season,
      game,
      gameUserId,
      serverId,
      telegramId,
    },
  );

  const teamId =
    crypto.randomUUID();

  const memberId =
    crypto.randomUUID();

  const now =
    new Date()
      .toISOString();

  const rulesVersion =
    cleanText(
      env?.RULES_VERSION,
    ) || "2026.1";

  const mediaPolicyVersion =
    cleanText(
      env?.MEDIA_POLICY_VERSION,
    ) || "2026.1";

  const insertTeam =
    database
      .prepare(
        `
          INSERT INTO teams (
            id,
            season,
            game,
            name,
            tag,
            region,
            logo_url,
            captain_telegram_id,
            media_consent,
            rules_consent,
            consented_at,
            rules_version,
            media_policy_version,
            consent_telegram_id,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            1, 1, ?, ?, ?, ?,
            'DRAFT', ?, ?
          )
        `,
      )
      .bind(
        teamId,
        season,
        game,
        name,
        tag,
        region,
        logoUrl,
        telegramId,
        now,
        rulesVersion,
        mediaPolicyVersion,
        telegramId,
        now,
        now,
      );

  const insertCaptain =
    database
      .prepare(
        `
          INSERT INTO team_members (
            id,
            team_id,
            season,
            game,
            telegram_id,
            first_name,
            full_name,
            birth_date,
            region,
            phone,
            username,
            game_user_id,
            server_id,
            nickname,
            role,
            confirmation_status,
            created_at
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'CAPTAIN',
            'CONFIRMED',
            ?
          )
        `,
      )
      .bind(
        memberId,
        teamId,
        season,
        game,
        telegramId,
        fullName,
        fullName,
        birthDate,
        region,
        phone,
        username,
        gameUserId,
        serverId,
        nickname,
        now,
      );

  try {
    await database.batch([
      insertTeam,
      insertCaptain,
    ]);
  } catch (error) {
    throwCreateDatabaseError(
      error,
    );
  }

  return getTeamById(
    env,
    teamId,
  );
}

export async function listTeams(
  env,
  searchParams,
) {
  const database =
    requireDatabase(env);

  const season =
    cleanText(
      searchParams.get(
        "season",
      ),
    ) || DEFAULT_SEASON;

  const gameValue =
    cleanText(
      searchParams.get(
        "game",
      ),
    );

  const status =
    cleanText(
      searchParams.get(
        "status",
      ),
    ).toUpperCase();

  const conditions = [
    "t.season = ?",
  ];

  const parameters = [
    season,
  ];

  if (gameValue) {
    conditions.push(
      "t.game = ?",
    );

    parameters.push(
      normalizeGame(
        gameValue,
      ),
    );
  }

  if (status) {
    conditions.push(
      "t.status = ?",
    );

    parameters.push(
      status,
    );
  }

  const teams =
    await queryAll(
      database,
      `
        SELECT
          t.id,
          t.season,
          t.game,
          t.name,
          t.tag,
          t.region,

          t.technical_number
            AS "technicalNumber",

          t.logo_url
            AS "logoUrl",

          t.league_tier
            AS "leagueTier",

          t.league_assigned_at
            AS "leagueAssignedAt",

          t.status,

          t.created_at
            AS "createdAt",

          COUNT(tm.id)
            AS "memberCount"

        FROM teams t

        LEFT JOIN team_members tm
          ON tm.team_id = t.id

        WHERE ${
          conditions.join(
            " AND ",
          )
        }

        GROUP BY
          t.id

        ORDER BY
          t.created_at DESC
      `,
      parameters,
    );

  return {
    teams:
      teams.map(
        (team) => ({
          ...team,

          memberCount:
            Number(
              team.memberCount ||
              0,
            ),
        }),
      ),
  };
}

export async function getTeamById(
  env,
  rawTeamId,
) {
  const database =
    requireDatabase(env);

  const teamId =
    normalizeTeamId(
      rawTeamId,
    );

  const team =
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          game,
          name,
          tag,
          region,

          technical_number
            AS "technicalNumber",

          logo_url
            AS "logoUrl",

          captain_telegram_id
            AS "captainTelegramId",

          media_consent
            AS "mediaConsent",

          rules_consent
            AS "rulesConsent",

          consented_at
            AS "consentedAt",

          rules_version
            AS "rulesVersion",

          media_policy_version
            AS "mediaPolicyVersion",

          consent_telegram_id
            AS "consentTelegramId",

          league_tier
            AS "leagueTier",

          next_season
            AS "nextSeason",

          next_league_tier
            AS "nextLeagueTier",

          league_assigned_at
            AS "leagueAssignedAt",

          league_assigned_by
            AS "leagueAssignedBy",

          status,

          created_at
            AS "createdAt",

          updated_at
            AS "updatedAt"

        FROM teams

        WHERE id = ?
      `,
      [
        teamId,
      ],
    );

  if (!team) {
    throw new ApiError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  const minimumAge =
    getMinimumAge(
      env,
      team.game,
    );

  const memberRows =
    await queryAll(
      database,
      `
        SELECT
          id,

          telegram_id
            AS "telegramId",

          first_name
            AS "firstName",

          full_name
            AS "fullName",

          birth_date
            AS "birthDate",

          region,
          phone,
          username,

          game_user_id
            AS "gameUserId",

          server_id
            AS "serverId",

          nickname,
          role,

          confirmation_status
            AS "confirmationStatus",

          created_at
            AS "createdAt"

        FROM team_members

        WHERE team_id = ?

        ORDER BY
          CASE role
            WHEN 'CAPTAIN'
              THEN 1
            WHEN 'MAIN'
              THEN 2
            WHEN 'RESERVE'
              THEN 3
            ELSE 4
          END,

          created_at ASC
      `,
      [
        teamId,
      ],
    );

  const countsRow =
    await queryFirst(
      database,
      `
        SELECT
          COUNT(*)
            AS total,

          COALESCE(
            SUM(
              CASE
                WHEN role IN (
                  'CAPTAIN',
                  'MAIN'
                )
                  THEN 1
                ELSE 0
              END
            ),
            0
          )
            AS "mainCount",

          COALESCE(
            SUM(
              CASE
                WHEN role =
                  'RESERVE'
                  THEN 1
                ELSE 0
              END
            ),
            0
          )
            AS "reserveCount",

          COALESCE(
            SUM(
              CASE
                WHEN
                  confirmation_status =
                  'CONFIRMED'
                  THEN 1
                ELSE 0
              END
            ),
            0
          )
            AS "confirmedCount"

        FROM team_members

        WHERE team_id = ?
      `,
      [
        teamId,
      ],
    );

  const members =
    memberRows.map(
      (member) => {
        const age =
          calculateAge(
            member.birthDate,
          );

        return {
          ...member,
          age,

          eligible:
            Number.isInteger(
              age,
            ) &&
            age >=
              minimumAge,
        };
      },
    );

  return {
    ...team,

    mediaConsent:
      Boolean(
        Number(
          team.mediaConsent ||
          0,
        ),
      ),

    rulesConsent:
      Boolean(
        Number(
          team.rulesConsent ||
          0,
        ),
      ),

    minimumAge,
    members,

    limits:
      getTeamLimits(
        team.game,
      ),

    counts: {
      total:
        Number(
          countsRow?.total ||
          0,
        ),

      mainCount:
        Number(
          countsRow?.mainCount ||
          0,
        ),

      reserveCount:
        Number(
          countsRow?.reserveCount ||
          0,
        ),

      confirmedCount:
        Number(
          countsRow?.confirmedCount ||
          0,
        ),
    },
  };
}