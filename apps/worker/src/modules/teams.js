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

function normalizeRosterRole(
  value,
) {
  const role =
    cleanText(value)
      .toUpperCase();

  if (
    ![
      "MAIN",
      "RESERVE",
    ].includes(role)
  ) {
    throw new ApiError(
      "O‘yinchi roli MAIN yoki RESERVE bo‘lishi kerak.",
      400,
      "INVALID_MEMBER_ROLE",
    );
  }

  return role;
}

async function getWritableRosterTeam(
  database,
  teamId,
) {
  const normalizedTeamId =
    cleanText(teamId);

  const team =
    await queryFirst(
      database,
      `
        SELECT
          id,
          season,
          game,
          status

        FROM teams

        WHERE id = ?

        LIMIT 1
      `,
      [
        normalizedTeamId,
      ],
    );

  if (!team) {
    throw new ApiError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  if (
    ![
      "DRAFT",
      "PENDING_CONFIRMATION",
    ].includes(team.status)
  ) {
    throw new ApiError(
      "Ushbu jamoa tarkibini hozir o‘zgartirib bo‘lmaydi.",
      409,
      "TEAM_ROSTER_LOCKED",
    );
  }

  return team;
}

async function getRosterCounts(
  database,
  teamId,
) {
  const row =
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
                WHEN role = 'RESERVE'
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
                WHEN confirmation_status =
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

  return {
    total:
      Number(
        row?.total || 0,
      ),

    mainCount:
      Number(
        row?.mainCount || 0,
      ),

    reserveCount:
      Number(
        row?.reserveCount || 0,
      ),

    confirmedCount:
      Number(
        row?.confirmedCount || 0,
      ),
  };
}

export async function addTeamMember(
  env,
  teamId,
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

  const team =
    await getWritableRosterTeam(
      database,
      teamId,
    );

  const role =
    normalizeRosterRole(
      payload.role,
    );

  const telegramId =
    normalizeTelegramId(
      payload.telegramId,
    );

  const fullName =
    validateFullName(
      payload.fullName,
    );

  const birthDate =
    validateBirthDate(
      payload.birthDate,
      env,
      team.game,
    );

  const region =
    validateRegion(
      payload.region,
    );

  const phone =
    normalizePhone(
      payload.phone,
    );

  const gameUserId =
    normalizeNumericId(
      payload.gameUserId,

      team.game === "PUBG"
        ? "PUBG ID"
        : "Mobile Legends User ID",
    );

  const serverId =
    team.game === "MLBB"
      ? normalizeNumericId(
          payload.serverId,
          "Server / Zone ID",
        )
      : "";

  const nickname =
    validateNickname(
      payload.nickname,
    );

  const username =
    cleanText(
      payload.username,
    ).replace(
      /^@/,
      "",
    );

  await ensureUniquePlayer(
    database,
    {
      season:
        team.season,

      game:
        team.game,

      gameUserId,
      serverId,
      telegramId,
    },
  );

  const counts =
    await getRosterCounts(
      database,
      team.id,
    );

  const limits =
    getTeamLimits(
      team.game,
    );

  if (
    counts.total >=
    limits.total
  ) {
    throw new ApiError(
      "Jamoa tarkibi to‘lgan.",
      409,
      "TEAM_CAPACITY_REACHED",
    );
  }

  if (
    role === "MAIN" &&
    counts.mainCount >=
      limits.main
  ) {
    throw new ApiError(
      `Asosiy tarkibda ko‘pi bilan ${limits.main} o‘yinchi bo‘lishi mumkin.`,
      409,
      "MAIN_CAPACITY_REACHED",
    );
  }

  if (
    role === "RESERVE" &&
    counts.reserveCount >=
      limits.reserve
  ) {
    throw new ApiError(
      `Zaxirada ko‘pi bilan ${limits.reserve} o‘yinchi bo‘lishi mumkin.`,
      409,
      "RESERVE_CAPACITY_REACHED",
    );
  }

  const memberId =
    crypto.randomUUID();

  const now =
    new Date()
      .toISOString();

  const insertMember =
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
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'PENDING',
            ?
          )
        `,
      )
      .bind(
        memberId,
        team.id,
        team.season,
        team.game,
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
        role,
        now,
      );

  const updateTeam =
    database
      .prepare(
        `
          UPDATE teams

          SET
            status =
              'PENDING_CONFIRMATION',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        team.id,
      );

  try {
    await database.batch([
      insertMember,
      updateTeam,
    ]);
  } catch (error) {
    throwCreateDatabaseError(
      error,
    );
  }

  return getTeamById(
    env,
    team.id,
  );
}

export async function removeTeamMember(
  env,
  teamId,
  memberId,
) {
  const database =
    requireDatabase(env);

  const team =
    await getWritableRosterTeam(
      database,
      teamId,
    );

  const normalizedMemberId =
    cleanText(memberId);

  const member =
    await queryFirst(
      database,
      `
        SELECT
          id,
          role

        FROM team_members

        WHERE
          id = ?
          AND team_id = ?

        LIMIT 1
      `,
      [
        normalizedMemberId,
        team.id,
      ],
    );

  if (!member) {
    throw new ApiError(
      "O‘yinchi topilmadi.",
      404,
      "MEMBER_NOT_FOUND",
    );
  }

  if (
    member.role ===
    "CAPTAIN"
  ) {
    throw new ApiError(
      "Jamoa sardorini tarkibdan olib tashlab bo‘lmaydi.",
      409,
      "CAPTAIN_CANNOT_BE_REMOVED",
    );
  }

  const now =
    new Date()
      .toISOString();

  const deleteMember =
    database
      .prepare(
        `
          DELETE FROM team_members

          WHERE
            id = ?
            AND team_id = ?
        `,
      )
      .bind(
        member.id,
        team.id,
      );

  const updateTeam =
    database
      .prepare(
        `
          UPDATE teams

          SET
            status =
              CASE
                WHEN (
                  SELECT COUNT(*)
                  FROM team_members
                  WHERE team_id = ?
                ) > 1
                  THEN 'PENDING_CONFIRMATION'

                ELSE 'DRAFT'
              END,

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        team.id,
        now,
        team.id,
      );

  await database.batch([
    deleteMember,
    updateTeam,
  ]);

  return getTeamById(
    env,
    team.id,
  );
}

function normalizeInviteToken(
  value,
) {
  const token =
    cleanText(value)
      .toLowerCase();

  if (
    !/^[a-f0-9]{32}$/.test(
      token,
    )
  ) {
    throw new ApiError(
      "Tasdiqlash havolasi topilmadi.",
      404,
      "INVITE_NOT_FOUND",
    );
  }

  return token;
}

function createInviteToken() {
  const bytes =
    new Uint8Array(16);

  crypto.getRandomValues(
    bytes,
  );

  return Array.from(bytes)
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");
}

function normalizeBotUsername(
  value,
) {
  const username =
    cleanText(value)
      .replace(
        /^@/,
        "",
      );

  if (
    !/^[A-Za-z0-9_]{5,32}$/.test(
      username,
    )
  ) {
    throw new ApiError(
      "Bot username sozlanmagan.",
      500,
      "BOT_USERNAME_NOT_CONFIGURED",
    );
  }

  return username;
}

async function getInviteRecord(
  database,
  rawToken,
) {
  const token =
    normalizeInviteToken(
      rawToken,
    );

  return queryFirst(
    database,
    `
      SELECT
        mi.id,
        mi.team_id
          AS "teamId",

        mi.member_id
          AS "memberId",

        mi.token,
        mi.status,

        mi.expires_at
          AS "expiresAt",

        mi.created_at
          AS "createdAt",

        mi.updated_at
          AS "updatedAt",

        t.season,
        t.game,

        t.name
          AS "teamName",

        t.tag
          AS "teamTag",

        t.region,

        t.logo_url
          AS "logoUrl",

        tm.first_name
          AS "memberFirstName",

        tm.nickname
          AS "memberNickname",

        tm.role
          AS "memberRole",

        tm.confirmation_status
          AS "confirmationStatus"

      FROM member_invites mi

      INNER JOIN teams t
        ON t.id =
          mi.team_id

      INNER JOIN team_members tm
        ON tm.id =
          mi.member_id

      WHERE mi.token = ?

      LIMIT 1
    `,
    [
      token,
    ],
  );
}

async function ensureInviteExists(
  database,
  rawToken,
) {
  const invite =
    await getInviteRecord(
      database,
      rawToken,
    );

  if (!invite) {
    throw new ApiError(
      "Tasdiqlash havolasi topilmadi.",
      404,
      "INVITE_NOT_FOUND",
    );
  }

  return invite;
}

async function ensureInviteActive(
  database,
  invite,
) {
  if (
    invite.status !==
    "PENDING"
  ) {
    if (
      invite.status ===
      "CONFIRMED"
    ) {
      throw new ApiError(
        "Bu taklif allaqachon tasdiqlangan.",
        409,
        "INVITE_ALREADY_CONFIRMED",
      );
    }

    if (
      invite.status ===
      "REJECTED"
    ) {
      throw new ApiError(
        "Bu taklif rad etilgan.",
        409,
        "INVITE_REJECTED",
      );
    }

    throw new ApiError(
      "Bu taklif endi faol emas.",
      410,
      "INVITE_INACTIVE",
    );
  }

  if (
    Date.parse(
      invite.expiresAt,
    ) <= Date.now()
  ) {
    const now =
      new Date()
        .toISOString();

    await database
      .prepare(
        `
          UPDATE member_invites

          SET
            status =
              'EXPIRED',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        invite.id,
      )
      .run();

    throw new ApiError(
      "Tasdiqlash havolasining muddati tugagan.",
      410,
      "INVITE_EXPIRED",
    );
  }
}

export async function createMemberInvite(
  env,
  rawTeamId,
  rawMemberId,
) {
  const database =
    requireDatabase(env);

  const teamId =
    cleanText(rawTeamId);

  const memberId =
    cleanText(rawMemberId);

  const member =
    await queryFirst(
      database,
      `
        SELECT
          tm.id,

          tm.team_id
            AS "teamId",

          tm.role,

          tm.confirmation_status
            AS "confirmationStatus",

          t.name
            AS "teamName",

          t.status
            AS "teamStatus"

        FROM team_members tm

        INNER JOIN teams t
          ON t.id =
            tm.team_id

        WHERE
          tm.id = ?
          AND tm.team_id = ?

        LIMIT 1
      `,
      [
        memberId,
        teamId,
      ],
    );

  if (!member) {
    throw new ApiError(
      "O‘yinchi topilmadi.",
      404,
      "MEMBER_NOT_FOUND",
    );
  }

  if (
    ![
      "DRAFT",
      "PENDING_CONFIRMATION",
    ].includes(
      member.teamStatus,
    )
  ) {
    throw new ApiError(
      "Ushbu jamoa tarkibi hozir tasdiqlash uchun yopiq.",
      409,
      "TEAM_ROSTER_LOCKED",
    );
  }

  if (
    member.role ===
    "CAPTAIN"
  ) {
    throw new ApiError(
      "Sardor allaqachon tasdiqlangan.",
      409,
      "CAPTAIN_ALREADY_CONFIRMED",
    );
  }

  if (
    member.confirmationStatus ===
    "CONFIRMED"
  ) {
    throw new ApiError(
      "Bu o‘yinchi allaqachon tarkibni tasdiqlagan.",
      409,
      "MEMBER_ALREADY_CONFIRMED",
    );
  }

  const botUsername =
    normalizeBotUsername(
      env.BOT_USERNAME,
    );

  const inviteId =
    crypto.randomUUID();

  const token =
    createInviteToken();

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
      7 *
      24 *
      60 *
      60 *
      1000,
    );

  const deleteOldInvite =
    database
      .prepare(
        `
          DELETE FROM member_invites

          WHERE member_id = ?
        `,
      )
      .bind(
        member.id,
      );

  const resetMember =
    database
      .prepare(
        `
          UPDATE team_members

          SET confirmation_status =
            'PENDING'

          WHERE id = ?
        `,
      )
      .bind(
        member.id,
      );

  const insertInvite =
    database
      .prepare(
        `
          INSERT INTO member_invites (
            id,
            team_id,
            member_id,
            token,
            status,
            expires_at,
            created_at,
            updated_at
          )
          VALUES (
            ?, ?, ?, ?,
            'PENDING',
            ?, ?, ?
          )
        `,
      )
      .bind(
        inviteId,
        member.teamId,
        member.id,
        token,
        expiresAt.toISOString(),
        now.toISOString(),
        now.toISOString(),
      );

  try {
    await database.batch([
      deleteOldInvite,
      resetMember,
      insertInvite,
    ]);
  } catch (error) {
    throwCreateDatabaseError(
      error,
    );
  }

  return {
    token,

    expiresAt:
      expiresAt
        .toISOString(),

    inviteLink:
      `https://t.me/${botUsername}?start=join_${token}`,
  };
}

export async function getInvitePreview(
  env,
  rawToken,
) {
  const database =
    requireDatabase(env);

  const invite =
    await ensureInviteExists(
      database,
      rawToken,
    );

  if (
    invite.status ===
      "PENDING" &&
    Date.parse(
      invite.expiresAt,
    ) <= Date.now()
  ) {
    const now =
      new Date()
        .toISOString();

    await database
      .prepare(
        `
          UPDATE member_invites

          SET
            status =
              'EXPIRED',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        invite.id,
      )
      .run();

    return {
      ...invite,
      status:
        "EXPIRED",
      updatedAt:
        now,
    };
  }

  return invite;
}

export async function confirmMemberInvite(
  env,
  rawToken,
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

  const invite =
    await ensureInviteExists(
      database,
      rawToken,
    );

  await ensureInviteActive(
    database,
    invite,
  );

  const telegramId =
    normalizeTelegramId(
      payload.telegramId,
      true,
    );

  const firstName =
    cleanText(
      payload.firstName,
    );

  const username =
    cleanText(
      payload.username,
    ).replace(
      /^@/,
      "",
    );

  const existingTelegramUser =
    await queryFirst(
      database,
      `
        SELECT
          tm.id,

          t.name
            AS "teamName"

        FROM team_members tm

        INNER JOIN teams t
          ON t.id =
            tm.team_id

        WHERE
          tm.season = ?
          AND tm.game = ?
          AND tm.telegram_id = ?
          AND tm.id != ?

        LIMIT 1
      `,
      [
        invite.season,
        invite.game,
        telegramId,
        invite.memberId,
      ],
    );

  if (existingTelegramUser) {
    throw new ApiError(
      `Siz ushbu o‘yinda "${existingTelegramUser.teamName}" jamoasiga allaqachon biriktirilgansiz.`,
      409,
      "TELEGRAM_USER_ALREADY_REGISTERED",
    );
  }

  const now =
    new Date()
      .toISOString();

  const updateMember =
    database
      .prepare(
        `
          UPDATE team_members

          SET
            telegram_id = ?,

            first_name =
              CASE
                WHEN ? != ''
                  THEN ?
                ELSE first_name
              END,

            username = ?,

            confirmation_status =
              'CONFIRMED'

          WHERE id = ?
        `,
      )
      .bind(
        telegramId,
        firstName,
        firstName,
        username,
        invite.memberId,
      );

  const updateInvite =
    database
      .prepare(
        `
          UPDATE member_invites

          SET
            status =
              'CONFIRMED',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        invite.id,
      );

  const updateTeam =
    database
      .prepare(
        `
          UPDATE teams

          SET
            status =
              'PENDING_CONFIRMATION',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        invite.teamId,
      );

  try {
    await database.batch([
      updateMember,
      updateInvite,
      updateTeam,
    ]);
  } catch (error) {
    throwCreateDatabaseError(
      error,
    );
  }

  return {
    message:
      "Jamoaga qo‘shilish tasdiqlandi.",

    invite:
      await getInvitePreview(
        env,
        invite.token,
      ),

    team:
      await getTeamById(
        env,
        invite.teamId,
      ),
  };
}

export async function rejectMemberInvite(
  env,
  rawToken,
) {
  const database =
    requireDatabase(env);

  const invite =
    await ensureInviteExists(
      database,
      rawToken,
    );

  await ensureInviteActive(
    database,
    invite,
  );

  const now =
    new Date()
      .toISOString();

  const updateMember =
    database
      .prepare(
        `
          UPDATE team_members

          SET confirmation_status =
            'REJECTED'

          WHERE id = ?
        `,
      )
      .bind(
        invite.memberId,
      );

  const updateInvite =
    database
      .prepare(
        `
          UPDATE member_invites

          SET
            status =
              'REJECTED',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        invite.id,
      );

  await database.batch([
    updateMember,
    updateInvite,
  ]);

  return {
    message:
      "Jamoa taklifi rad etildi.",

    invite:
      await getInvitePreview(
        env,
        invite.token,
      ),
  };
}

export async function submitTeam(
  env,
  rawTeamId,
) {
  const database =
    requireDatabase(env);

  const team =
    await getWritableRosterTeam(
      database,
      rawTeamId,
    );

  const detail =
    await getTeamById(
      env,
      team.id,
    );

  if (
    !detail.mediaConsent ||
    !detail.rulesConsent
  ) {
    throw new ApiError(
      "Media va liga shartlari roziliklari to‘liq tasdiqlanmagan.",
      409,
      "TEAM_CONSENTS_REQUIRED",
    );
  }

  const incompleteMembers =
    detail.members.filter(
      (member) =>
        !cleanText(
          member.fullName,
        ) ||
        !cleanText(
          member.birthDate,
        ) ||
        !cleanText(
          member.region,
        ) ||
        !cleanText(
          member.phone,
        ),
    );

  if (
    incompleteMembers.length >
    0
  ) {
    throw new ApiError(
      "Barcha o‘yinchilarning ism-familiyasi, tug‘ilgan sanasi, viloyati va telefon raqami to‘liq bo‘lishi kerak.",
      409,
      "MEMBER_PROFILE_INCOMPLETE",
    );
  }

  const underageMembers =
    detail.members.filter(
      (member) =>
        member.eligible !==
        true,
    );

  if (
    underageMembers.length >
    0
  ) {
    const players =
      underageMembers
        .map(
          (member) =>
            `${member.nickname} (${member.age ?? "?"} yosh)`,
        )
        .join(", ");

    throw new ApiError(
      `Yosh chegarasiga mos kelmaydi: ${players}. Minimal yosh ${detail.minimumAge}.`,
      409,
      "TEAM_HAS_UNDERAGE_MEMBERS",
    );
  }

  const counts =
    await getRosterCounts(
      database,
      team.id,
    );

  const limits =
    getTeamLimits(
      team.game,
    );

  if (
    counts.mainCount !==
    limits.main
  ) {
    throw new ApiError(
      `${team.game} jamoasida asosiy tarkib ${limits.main} nafar bo‘lishi kerak.`,
      409,
      "MAIN_ROSTER_INCOMPLETE",
    );
  }

  if (
    limits.reserveRequired &&
    counts.reserveCount !==
      limits.reserve
  ) {
    throw new ApiError(
      `${team.game} jamoasida ${limits.reserve} nafar zaxira o‘yinchi bo‘lishi shart.`,
      409,
      "RESERVE_ROSTER_INCOMPLETE",
    );
  }

  if (
    counts.confirmedCount !==
    counts.total
  ) {
    throw new ApiError(
      "Barcha o‘yinchilar jamoaga qo‘shilishni tasdiqlashi kerak.",
      409,
      "MEMBERS_NOT_CONFIRMED",
    );
  }

  const now =
    new Date()
      .toISOString();

  await database
    .prepare(
      `
        UPDATE teams

        SET
          status =
            'PENDING_REVIEW',

          updated_at = ?

        WHERE id = ?
      `,
    )
    .bind(
      now,
      team.id,
    )
    .run();

  return getTeamById(
    env,
    team.id,
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