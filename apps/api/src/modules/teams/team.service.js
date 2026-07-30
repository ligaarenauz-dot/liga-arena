import { randomUUID } from "node:crypto";
import { db } from "@liga-arena/database";

const DEFAULT_SEASON = "S01";

export class TeamServiceError extends Error {
  constructor(message, statusCode = 400, code = "TEAM_ERROR") {
    super(message);
    this.name = "TeamServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function cleanText(value) {
  return String(value ?? "").trim();
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

function getMinimumAge(game) {
  const environmentName =
    game === "MLBB"
      ? "MLBB_MIN_AGE"
      : "PUBG_MIN_AGE";

  const value = Number.parseInt(
    process.env[environmentName],
    10,
  );

  return Number.isInteger(value) &&
    value >= 5 &&
    value <= 99
    ? value
    : 16;
}

function validateFullName(value) {
  const fullName = cleanText(value)
    .replace(/\s+/g, " ");

  if (
    fullName.length < 5 ||
    fullName.length > 100 ||
    !fullName.includes(" ")
  ) {
    throw new TeamServiceError(
      "Ism va familiyani to‘liq kiriting.",
      400,
      "INVALID_FULL_NAME",
    );
  }

  return fullName;
}

function calculateAge(birthDate) {
  const [year, month, day] = birthDate
    .split("-")
    .map(Number);

  const today = new Date();
  let age = today.getUTCFullYear() - year;

  const currentMonth =
    today.getUTCMonth() + 1;
  const currentDay =
    today.getUTCDate();

  if (
    currentMonth < month ||
    (
      currentMonth === month &&
      currentDay < day
    )
  ) {
    age -= 1;
  }

  return age;
}

function validateBirthDate(value, game) {
  const birthDate = cleanText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new TeamServiceError(
      "Tug‘ilgan sanani to‘liq kiriting.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  const [year, month, day] = birthDate
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date > new Date()
  ) {
    throw new TeamServiceError(
      "Tug‘ilgan sana noto‘g‘ri.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  const age = calculateAge(birthDate);
  const minimumAge = getMinimumAge(game);

  if (age < minimumAge) {
    throw new TeamServiceError(
      `Liga uchun minimal yosh ${minimumAge}. O‘yinchi hozir ${age} yoshda.`,
      409,
      "PLAYER_UNDERAGE",
    );
  }

  if (age > 100) {
    throw new TeamServiceError(
      "Tug‘ilgan sana haqiqiy emas.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  return birthDate;
}

function validateRegion(value) {
  const region = cleanText(value);

  if (!REGIONS.includes(region)) {
    throw new TeamServiceError(
      "Yashash viloyatini ro‘yxatdan tanlang.",
      400,
      "INVALID_REGION",
    );
  }

  return region;
}

function normalizePhone(value) {
  const digits = cleanText(value).replace(/\D/g, "");

  let normalized = "";

  if (
    digits.length === 12 &&
    digits.startsWith("998")
  ) {
    normalized = `+${digits}`;
  } else if (digits.length === 9) {
    normalized = `+998${digits}`;
  }

  if (!/^\+998\d{9}$/.test(normalized)) {
    throw new TeamServiceError(
      "Telefon raqamini +998901234567 formatida kiriting.",
      400,
      "INVALID_PHONE",
    );
  }

  return normalized;
}

function normalizeGame(value) {
  const game = cleanText(value).toUpperCase();

  if (!["PUBG", "MLBB"].includes(game)) {
    throw new TeamServiceError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_GAME",
    );
  }

  return game;
}

function normalizeNumericId(value, fieldName) {
  const normalized = cleanText(value).replace(/\D/g, "");

  if (normalized.length < 4 || normalized.length > 24) {
    throw new TeamServiceError(
      `${fieldName} noto‘g‘ri kiritilgan.`,
      400,
      "INVALID_GAME_ID",
    );
  }

  return normalized;
}

function normalizeTelegramId(value, required = false) {
  const normalized = cleanText(value);

  if (required && !normalized) {
    throw new TeamServiceError(
      "Telegram ID kiritilishi shart.",
      400,
      "TELEGRAM_ID_REQUIRED",
    );
  }

  if (normalized && !/^\d+$/.test(normalized)) {
    throw new TeamServiceError(
      "Telegram ID faqat raqamlardan iborat bo‘lishi kerak.",
      400,
      "INVALID_TELEGRAM_ID",
    );
  }

  return normalized || null;
}

function normalizeTag(value) {
  const tag = cleanText(value)
    .replace(/\s+/g, "")
    .toUpperCase();

  if (tag.length < 2 || tag.length > 8) {
    throw new TeamServiceError(
      "Jamoa TAG’i 2–8 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_TEAM_TAG",
    );
  }

  return tag;
}

function normalizeRole(value) {
  const role = cleanText(value).toUpperCase();

  if (!["MAIN", "RESERVE"].includes(role)) {
    throw new TeamServiceError(
      "O‘yinchi roli MAIN yoki RESERVE bo‘lishi kerak.",
      400,
      "INVALID_MEMBER_ROLE",
    );
  }

  return role;
}

function validateTeamName(value) {
  const name = cleanText(value);

  if (name.length < 3 || name.length > 32) {
    throw new TeamServiceError(
      "Jamoa nomi 3–32 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_TEAM_NAME",
    );
  }

  return name;
}

function validateNickname(value) {
  const nickname = cleanText(value);

  if (nickname.length < 2 || nickname.length > 32) {
    throw new TeamServiceError(
      "O‘yinchi nickname’i 2–32 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_NICKNAME",
    );
  }

  return nickname;
}

function getRawTeam(teamId) {
  return db
    .prepare(`
      SELECT *
      FROM teams
      WHERE id = ?
    `)
    .get(teamId);
}

function getTeamLimits(game) {
  if (game === "PUBG") {
    return {
      main: 4,
      reserve: 2,
      total: 6,
      reserveRequired: false,
    };
  }

  return {
    main: 5,
    reserve: 1,
    total: 6,
    reserveRequired: true,
  };
}

function getMemberCounts(teamId) {
  return db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN role IN ('CAPTAIN', 'MAIN') THEN 1
            ELSE 0
          END
        ) AS mainCount,
        SUM(
          CASE
            WHEN role = 'RESERVE' THEN 1
            ELSE 0
          END
        ) AS reserveCount,
        SUM(
          CASE
            WHEN confirmation_status = 'CONFIRMED' THEN 1
            ELSE 0
          END
        ) AS confirmedCount
      FROM team_members
      WHERE team_id = ?
    `)
    .get(teamId);
}

function ensureUniquePlayer({
  season,
  game,
  gameUserId,
  serverId,
  telegramId,
}) {
  const existingGameId = db
    .prepare(`
      SELECT
        tm.id,
        t.name AS teamName
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE
        tm.season = ?
        AND tm.game = ?
        AND tm.game_user_id = ?
        AND tm.server_id = ?
      LIMIT 1
    `)
    .get(season, game, gameUserId, serverId);

  if (existingGameId) {
    throw new TeamServiceError(
      `Bu o‘yin ID allaqachon "${existingGameId.teamName}" jamoasida ro‘yxatdan o‘tgan.`,
      409,
      "DUPLICATE_GAME_ID",
    );
  }

  if (telegramId) {
    const existingTelegram = db
      .prepare(`
        SELECT
          tm.id,
          t.name AS teamName
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE
          tm.season = ?
          AND tm.game = ?
          AND tm.telegram_id = ?
        LIMIT 1
      `)
      .get(season, game, telegramId);

    if (existingTelegram) {
      throw new TeamServiceError(
        `Bu Telegram foydalanuvchisi allaqachon "${existingTelegram.teamName}" jamoasida ro‘yxatdan o‘tgan.`,
        409,
        "DUPLICATE_TELEGRAM_USER",
      );
    }
  }
}

export function getTeamById(teamId) {
  const team = db
    .prepare(`
      SELECT
        id,
        season,
        game,
        name,
        tag,
        region,

        technical_number
          AS technicalNumber,

        logo_url AS logoUrl,
        captain_telegram_id AS captainTelegramId,
        media_consent AS mediaConsent,
        rules_consent AS rulesConsent,
        consented_at AS consentedAt,
        rules_version AS rulesVersion,
        media_policy_version AS mediaPolicyVersion,
        consent_telegram_id AS consentTelegramId,
        league_tier AS leagueTier,

        next_season AS nextSeason,

        next_league_tier
          AS nextLeagueTier,

        league_assigned_at AS leagueAssignedAt,
        league_assigned_by AS leagueAssignedBy,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM teams
      WHERE id = ?
    `)
    .get(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  const minimumAge = getMinimumAge(team.game);

  const members = db
    .prepare(`
      SELECT
        id,
        telegram_id AS telegramId,
        first_name AS firstName,
        full_name AS fullName,
        birth_date AS birthDate,
        region,
        phone,
        username,
        game_user_id AS gameUserId,
        server_id AS serverId,
        nickname,
        role,
        confirmation_status AS confirmationStatus,
        created_at AS createdAt
      FROM team_members
      WHERE team_id = ?
      ORDER BY
        CASE role
          WHEN 'CAPTAIN' THEN 1
          WHEN 'MAIN' THEN 2
          WHEN 'RESERVE' THEN 3
          ELSE 4
        END,
        created_at ASC
    `)
    .all(teamId)
    .map((member) => {
      const age = member.birthDate
        ? calculateAge(member.birthDate)
        : null;

      return {
        ...member,
        age,
        eligible:
          Number.isInteger(age) &&
          age >= minimumAge,
      };
    });

  return {
    ...team,
    mediaConsent: Boolean(team.mediaConsent),
    rulesConsent: Boolean(team.rulesConsent),
    minimumAge,
    members,
    limits: getTeamLimits(team.game),
    counts: getMemberCounts(teamId),
  };
}

export function listTeams({
  game,
  season = DEFAULT_SEASON,
  status,
} = {}) {
  const conditions = ["t.season = ?"];
  const parameters = [cleanText(season) || DEFAULT_SEASON];

  if (game) {
    conditions.push("t.game = ?");
    parameters.push(normalizeGame(game));
  }

  if (status) {
    conditions.push("t.status = ?");
    parameters.push(cleanText(status).toUpperCase());
  }

  return db
    .prepare(`
      SELECT
        t.id,
        t.season,
        t.game,
        t.name,
        t.tag,
        t.region,

        t.technical_number
          AS technicalNumber,

        t.logo_url AS logoUrl,
        t.league_tier AS leagueTier,
        t.league_assigned_at AS leagueAssignedAt,
        t.status,
        t.created_at AS createdAt,
        COUNT(tm.id) AS memberCount
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `)
    .all(...parameters);
}

export function createTeam(payload = {}) {
  const game = normalizeGame(payload.game);
  const season = cleanText(payload.season) || DEFAULT_SEASON;
  const name = validateTeamName(payload.name);
  const tag = normalizeTag(payload.tag);
  const logoUrl = cleanText(payload.logoUrl);

  if (!logoUrl) {
    throw new TeamServiceError(
      "Jamoa logotipini yuklang.",
      400,
      "TEAM_LOGO_REQUIRED",
    );
  }

  const captain = payload.captain ?? {};

  const telegramId = normalizeTelegramId(
    captain.telegramId,
    true,
  );

  const fullName = validateFullName(
    captain.fullName,
  );

  const birthDate = validateBirthDate(
    captain.birthDate,
    game,
  );

  const region = validateRegion(
    captain.region || payload.region,
  );

  const phone = normalizePhone(
    captain.phone,
  );

  const gameUserId = normalizeNumericId(
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

  const nickname = validateNickname(captain.nickname);
  const username = cleanText(captain.username).replace(/^@/, "");

  const mediaConsent =
    payload.mediaConsent === true;

  const rulesConsent =
    payload.rulesConsent === true;

  if (!mediaConsent) {
    throw new TeamServiceError(
      "Surat va videolardan foydalanish roziligini tasdiqlang.",
      400,
      "MEDIA_CONSENT_REQUIRED",
    );
  }

  if (!rulesConsent) {
    throw new TeamServiceError(
      "Liga reglamenti va shartlariga rozilikni tasdiqlang.",
      400,
      "RULES_CONSENT_REQUIRED",
    );
  }

  const existingName = db
    .prepare(`
      SELECT id
      FROM teams
      WHERE season = ? AND game = ? AND name = ?
    `)
    .get(season, game, name);

  if (existingName) {
    throw new TeamServiceError(
      "Bu nomdagi jamoa ushbu ligada allaqachon mavjud.",
      409,
      "DUPLICATE_TEAM_NAME",
    );
  }

  const existingTag = db
    .prepare(`
      SELECT id
      FROM teams
      WHERE season = ? AND game = ? AND tag = ?
    `)
    .get(season, game, tag);

  if (existingTag) {
    throw new TeamServiceError(
      "Bu TAG boshqa jamoa tomonidan ishlatilmoqda.",
      409,
      "DUPLICATE_TEAM_TAG",
    );
  }

  ensureUniquePlayer({
    season,
    game,
    gameUserId,
    serverId,
    telegramId,
  });

  const teamId = randomUUID();
  const memberId = randomUUID();
  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
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
    `).run(
      teamId,
      season,
      game,
      name,
      tag,
      region,
      logoUrl,
      telegramId,
      now,
      cleanText(process.env.RULES_VERSION) || "2026.1",
      cleanText(process.env.MEDIA_POLICY_VERSION) || "2026.1",
      telegramId,
      now,
      now,
    );

    db.prepare(`
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
    `).run(
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

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getTeamById(teamId);
}

export function addTeamMember(teamId, payload = {}) {
  const team = getRawTeam(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  if (!["DRAFT", "PENDING_CONFIRMATION"].includes(team.status)) {
    throw new TeamServiceError(
      "Ushbu jamoa tarkibini hozir o‘zgartirib bo‘lmaydi.",
      409,
      "TEAM_ROSTER_LOCKED",
    );
  }

  const role = normalizeRole(payload.role);
  const telegramId = normalizeTelegramId(payload.telegramId);

  const fullName = validateFullName(
    payload.fullName,
  );

  const birthDate = validateBirthDate(
    payload.birthDate,
    team.game,
  );

  const region = validateRegion(
    payload.region,
  );

  const phone = normalizePhone(
    payload.phone,
  );

  const gameUserId = normalizeNumericId(
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

  const nickname = validateNickname(payload.nickname);
  const username = cleanText(payload.username).replace(/^@/, "");

  ensureUniquePlayer({
    season: team.season,
    game: team.game,
    gameUserId,
    serverId,
    telegramId,
  });

  const counts = getMemberCounts(teamId);
  const limits = getTeamLimits(team.game);

  if (Number(counts.total) >= limits.total) {
    throw new TeamServiceError(
      "Jamoa tarkibi to‘lgan.",
      409,
      "TEAM_CAPACITY_REACHED",
    );
  }

  if (
    role === "MAIN" &&
    Number(counts.mainCount) >= limits.main
  ) {
    throw new TeamServiceError(
      `Asosiy tarkibda ko‘pi bilan ${limits.main} o‘yinchi bo‘lishi mumkin.`,
      409,
      "MAIN_CAPACITY_REACHED",
    );
  }

  if (
    role === "RESERVE" &&
    Number(counts.reserveCount) >= limits.reserve
  ) {
    throw new TeamServiceError(
      `Zaxirada ko‘pi bilan ${limits.reserve} o‘yinchi bo‘lishi mumkin.`,
      409,
      "RESERVE_CAPACITY_REACHED",
    );
  }

  const memberId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
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
  `).run(
    memberId,
    teamId,
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

  db.prepare(`
    UPDATE teams
    SET
      status = 'PENDING_CONFIRMATION',
      updated_at = ?
    WHERE id = ?
  `).run(now, teamId);

  return getTeamById(teamId);
}

export function removeTeamMember(teamId, memberId) {
  const team = getRawTeam(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  if (!["DRAFT", "PENDING_CONFIRMATION"].includes(team.status)) {
    throw new TeamServiceError(
      "Ushbu jamoa tarkibini hozir o‘zgartirib bo‘lmaydi.",
      409,
      "TEAM_ROSTER_LOCKED",
    );
  }

  const member = db
    .prepare(`
      SELECT
        id,
        role
      FROM team_members
      WHERE
        id = ?
        AND team_id = ?
    `)
    .get(memberId, teamId);

  if (!member) {
    throw new TeamServiceError(
      "O‘yinchi topilmadi.",
      404,
      "MEMBER_NOT_FOUND",
    );
  }

  if (member.role === "CAPTAIN") {
    throw new TeamServiceError(
      "Jamoa sardorini tarkibdan olib tashlab bo‘lmaydi.",
      409,
      "CAPTAIN_CANNOT_BE_REMOVED",
    );
  }

  db.prepare(`
    DELETE FROM team_members
    WHERE
      id = ?
      AND team_id = ?
  `).run(memberId, teamId);

  const counts = getMemberCounts(teamId);
  const nextStatus =
    Number(counts.total) > 1
      ? "PENDING_CONFIRMATION"
      : "DRAFT";

  db.prepare(`
    UPDATE teams
    SET
      status = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    nextStatus,
    new Date().toISOString(),
    teamId,
  );

  return getTeamById(teamId);
}

export function devConfirmAllTeamMembers(teamId) {
  if (process.env.NODE_ENV === "production") {
    throw new TeamServiceError(
      "Development tasdiqlash production rejimida mavjud emas.",
      403,
      "DEV_CONFIRM_DISABLED",
    );
  }

  const team = getRawTeam(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  if (!["DRAFT", "PENDING_CONFIRMATION"].includes(team.status)) {
    throw new TeamServiceError(
      "Ushbu jamoa tarkibi hozir tasdiqlash uchun yopiq.",
      409,
      "TEAM_ROSTER_LOCKED",
    );
  }

  const pendingMembers = db
    .prepare(`
      SELECT id
      FROM team_members
      WHERE
        team_id = ?
        AND role != 'CAPTAIN'
        AND confirmation_status != 'CONFIRMED'
      ORDER BY created_at ASC
    `)
    .all(teamId);

  if (pendingMembers.length === 0) {
    return {
      confirmedCount: 0,
      team: getTeamById(teamId),
    };
  }

  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    pendingMembers.forEach((member, index) => {
      const fakeTelegramId =
        `999${Date.now()}${index}${Math.floor(
          Math.random() * 1000000,
        )
          .toString()
          .padStart(6, "0")}`;

      db.prepare(`
        UPDATE team_members
        SET
          telegram_id = ?,
          username = CASE
            WHEN username IS NULL OR username = ''
              THEN ?
            ELSE username
          END,
          confirmation_status = 'CONFIRMED'
        WHERE id = ?
      `).run(
        fakeTelegramId,
        `dev_player_${index + 1}`,
        member.id,
      );

      db.prepare(`
        UPDATE member_invites
        SET
          status = 'CONFIRMED',
          updated_at = ?
        WHERE member_id = ?
      `).run(now, member.id);
    });

    db.prepare(`
      UPDATE teams
      SET
        status = 'PENDING_CONFIRMATION',
        updated_at = ?
      WHERE id = ?
    `).run(now, teamId);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    confirmedCount: pendingMembers.length,
    team: getTeamById(teamId),
  };
}

export function submitTeam(teamId) {
  const team = getRawTeam(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  const counts = getMemberCounts(teamId);
  const limits = getTeamLimits(team.game);
  const minimumAge = getMinimumAge(team.game);

  if (
    !Boolean(team.media_consent) ||
    !Boolean(team.rules_consent)
  ) {
    throw new TeamServiceError(
      "Media va liga shartlari roziliklari to‘liq tasdiqlanmagan.",
      409,
      "TEAM_CONSENTS_REQUIRED",
    );
  }

  const incompleteMembers = db
    .prepare(`
      SELECT id
      FROM team_members
      WHERE
        team_id = ?
        AND (
          TRIM(full_name) = ''
          OR TRIM(birth_date) = ''
          OR TRIM(region) = ''
          OR TRIM(phone) = ''
        )
    `)
    .all(teamId);

  if (incompleteMembers.length > 0) {
    throw new TeamServiceError(
      "Barcha o‘yinchilarning ism-familiyasi, tug‘ilgan sanasi, viloyati va telefon raqami to‘liq bo‘lishi kerak.",
      409,
      "MEMBER_PROFILE_INCOMPLETE",
    );
  }

  const underageMembers = db
    .prepare(`
      SELECT
        nickname,
        birth_date AS birthDate
      FROM team_members
      WHERE team_id = ?
    `)
    .all(teamId)
    .map((member) => ({
      ...member,
      age: calculateAge(member.birthDate),
    }))
    .filter((member) => member.age < minimumAge);

  if (underageMembers.length > 0) {
    const players = underageMembers
      .map(
        (member) =>
          `${member.nickname} (${member.age} yosh)`,
      )
      .join(", ");

    throw new TeamServiceError(
      `Yosh chegarasiga mos kelmaydi: ${players}. Minimal yosh ${minimumAge}.`,
      409,
      "TEAM_HAS_UNDERAGE_MEMBERS",
    );
  }

  if (Number(counts.mainCount) !== limits.main) {
    throw new TeamServiceError(
      `${team.game} jamoasida asosiy tarkib ${limits.main} nafar bo‘lishi kerak.`,
      409,
      "MAIN_ROSTER_INCOMPLETE",
    );
  }

  if (
    limits.reserveRequired &&
    Number(counts.reserveCount) !== limits.reserve
  ) {
    throw new TeamServiceError(
      `${team.game} jamoasida ${limits.reserve} nafar zaxira o‘yinchi bo‘lishi shart.`,
      409,
      "RESERVE_ROSTER_INCOMPLETE",
    );
  }

  const pendingMembers = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM team_members
      WHERE
        team_id = ?
        AND confirmation_status != 'CONFIRMED'
    `)
    .get(teamId);

  if (Number(pendingMembers.count) > 0) {
    throw new TeamServiceError(
      "Barcha o‘yinchilar jamoaga qo‘shilishni tasdiqlashi kerak.",
      409,
      "MEMBERS_NOT_CONFIRMED",
    );
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE teams
    SET
      status = 'PENDING_REVIEW',
      updated_at = ?
    WHERE id = ?
  `).run(now, teamId);

  return getTeamById(teamId);
}

export function checkGameId({
  game,
  season = DEFAULT_SEASON,
  gameUserId,
  serverId,
}) {
  const normalizedGame = normalizeGame(game);
  const normalizedGameUserId = normalizeNumericId(
    gameUserId,
    "O‘yin ID",
  );

  const normalizedServerId =
    normalizedGame === "MLBB"
      ? normalizeNumericId(serverId, "Server ID")
      : "";

  const result = db
    .prepare(`
      SELECT
        tm.id,
        t.name AS teamName
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE
        tm.season = ?
        AND tm.game = ?
        AND tm.game_user_id = ?
        AND tm.server_id = ?
      LIMIT 1
    `)
    .get(
      cleanText(season) || DEFAULT_SEASON,
      normalizedGame,
      normalizedGameUserId,
      normalizedServerId,
    );

  return {
    exists: Boolean(result),
    available: !result,
  };
}