import { randomUUID } from "node:crypto";
import { db } from "@liga-arena/database";
import {
  TeamServiceError,
  getTeamById,
} from "../teams/team.service.js";

import {
  getTeamEligibility,
} from "../eligibility/eligibility.service.js";

const allowedStatuses = new Set([
  "DRAFT",
  "PENDING_CONFIRMATION",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "LOCKED",
]);

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeAdminName(value) {
  const adminName = cleanText(value);

  return adminName || "Liga Arena Admin";
}

const leagueTiers = Object.freeze({
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

function normalizeLeagueTier(game, value) {
  const tier =
    cleanText(value).toUpperCase();

  const allowed =
    leagueTiers[game] || [];

  if (!allowed.includes(tier)) {
    throw new TeamServiceError(
      "Tanlangan liga darajasi ushbu o‘yinga mos emas.",
      400,
      "INVALID_LEAGUE_TIER",
    );
  }

  return tier;
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

function requireTeam(teamId) {
  const team = getRawTeam(teamId);

  if (!team) {
    throw new TeamServiceError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  return team;
}

function requirePendingReview(team) {
  if (team.status !== "PENDING_REVIEW") {
    throw new TeamServiceError(
      "Faqat admin tekshiruvidagi jamoaga qaror chiqarish mumkin.",
      409,
      "TEAM_NOT_PENDING_REVIEW",
    );
  }
}

function calculatePlayerAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  const parts = String(birthDate)
    .split("-")
    .map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    return null;
  }

  const [year, month, day] = parts;

  const birth = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();

  let age =
    now.getUTCFullYear() - year;

  const currentMonth =
    now.getUTCMonth() + 1;

  const currentDay =
    now.getUTCDate();

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

function getMinimumAge(game) {
  const environmentName =
    game === "MLBB"
      ? "MLBB_MIN_AGE"
      : "PUBG_MIN_AGE";

  const configuredAge = Number.parseInt(
    process.env[environmentName],
    10,
  );

  if (
    Number.isInteger(configuredAge) &&
    configuredAge >= 5 &&
    configuredAge <= 99
  ) {
    return configuredAge;
  }

  return 16;
}

function validateTeamForApproval(teamId) {
  const team = getTeamById(teamId);

  const members = Array.isArray(team.members)
    ? team.members
    : [];

  const counts = team.counts || {};
  const limits = team.limits || {};

  const errors = [];
  const minimumAge =
    getMinimumAge(team.game);

  const mainCount =
    Number(counts.mainCount || 0);

  const reserveCount =
    Number(counts.reserveCount || 0);

  const totalCount =
    Number(counts.total || 0);

  const confirmedCount =
    Number(counts.confirmedCount || 0);

  if (!String(team.logoUrl || "").trim()) {
    errors.push(
      "Jamoa logosi yuklanmagan.",
    );
  }

  if (
    mainCount !==
    Number(limits.main || 0)
  ) {
    errors.push(
      `Asosiy tarkib ${limits.main} nafar bo‘lishi kerak.`,
    );
  }

  if (
    team.game === "MLBB" &&
    reserveCount !==
      Number(limits.reserve || 0)
  ) {
    errors.push(
      `Mobile Legends jamoasida ${limits.reserve} nafar zaxira o‘yinchi bo‘lishi kerak.`,
    );
  }

  if (
    team.game === "PUBG" &&
    reserveCount >
      Number(limits.reserve || 0)
  ) {
    errors.push(
      `PUBG zaxira tarkibi ${limits.reserve} nafardan oshmasligi kerak.`,
    );
  }

  if (
    totalCount === 0 ||
    confirmedCount !== totalCount
  ) {
    errors.push(
      "Barcha o‘yinchilar Telegram orqali tasdiqlamagan.",
    );
  }

  if (!team.mediaConsent) {
    errors.push(
      "Media materiallaridan foydalanish roziligi berilmagan.",
    );
  }

  if (!team.rulesConsent) {
    errors.push(
      "Liga reglamenti va shartlari tasdiqlanmagan.",
    );
  }

  for (const member of members) {
    const playerName =
      member.nickname ||
      member.fullName ||
      member.firstName ||
      "O‘yinchi";

    const fullName = String(
      member.fullName || "",
    ).trim();

    const birthDate = String(
      member.birthDate || "",
    ).trim();

    const region = String(
      member.region || "",
    ).trim();

    const phone = String(
      member.phone || "",
    ).trim();

    const nickname = String(
      member.nickname || "",
    ).trim();

    const gameUserId = String(
      member.gameUserId || "",
    ).trim();

    const serverId = String(
      member.serverId || "",
    ).trim();

    if (
      fullName.length < 5 ||
      !fullName.includes(" ")
    ) {
      errors.push(
        `${playerName}: ism va familiya to‘liq emas.`,
      );
    }

    const age =
      calculatePlayerAge(birthDate);

    if (!Number.isInteger(age)) {
      errors.push(
        `${playerName}: tug‘ilgan sana noto‘g‘ri yoki kiritilmagan.`,
      );
    } else if (age < minimumAge) {
      errors.push(
        `${playerName}: ${age} yosh. Minimal talab ${minimumAge} yosh.`,
      );
    }

    if (!region) {
      errors.push(
        `${playerName}: yashash hududi kiritilmagan.`,
      );
    }

    if (!/^\+998\d{9}$/.test(phone)) {
      errors.push(
        `${playerName}: telefon raqami noto‘g‘ri.`,
      );
    }

    if (nickname.length < 2) {
      errors.push(
        `${playerName}: IGN kiritilmagan.`,
      );
    }

    if (gameUserId.length < 4) {
      errors.push(
        team.game === "PUBG"
          ? `${playerName}: PUBG ID noto‘g‘ri.`
          : `${playerName}: Mobile Legends User ID noto‘g‘ri.`,
      );
    }

    if (
      team.game === "MLBB" &&
      serverId.length < 3
    ) {
      errors.push(
        `${playerName}: Server / Zone ID noto‘g‘ri.`,
      );
    }

    if (
      member.confirmationStatus !==
      "CONFIRMED"
    ) {
      errors.push(
        `${playerName}: Telegram tasdig‘i olinmagan.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    minimumAge,

    counts: {
      total: totalCount,
      confirmed: confirmedCount,
      main: mainCount,
      reserve: reserveCount,
    },
  };
}

export function getAdminStats() {
  const statusRows = db
    .prepare(`
      SELECT
        status,
        COUNT(*) AS count
      FROM teams
      GROUP BY status
    `)
    .all();

  const gameRows = db
    .prepare(`
      SELECT
        game,
        COUNT(*) AS count
      FROM teams
      GROUP BY game
    `)
    .all();

  const statuses = {
    DRAFT: 0,
    PENDING_CONFIRMATION: 0,
    PENDING_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    LOCKED: 0,
  };

  for (const row of statusRows) {
    statuses[row.status] = Number(row.count || 0);
  }

  const games = {
    PUBG: 0,
    MLBB: 0,
  };

  for (const row of gameRows) {
    games[row.game] = Number(row.count || 0);
  }

  return {
    statuses,
    games,
    total: Object.values(statuses).reduce(
      (sum, count) => sum + count,
      0,
    ),
  };
}

export function listAdminTeams({
  status = "PENDING_REVIEW",
  game,
} = {}) {
  const conditions = [];
  const parameters = [];

  const normalizedStatus = cleanText(status).toUpperCase();

  if (
    normalizedStatus &&
    normalizedStatus !== "ALL"
  ) {
    if (!allowedStatuses.has(normalizedStatus)) {
      throw new TeamServiceError(
        "Noto‘g‘ri jamoa holati.",
        400,
        "INVALID_TEAM_STATUS",
      );
    }

    conditions.push("t.status = ?");
    parameters.push(normalizedStatus);
  }

  const normalizedGame = cleanText(game).toUpperCase();

  if (normalizedGame) {
    if (!["PUBG", "MLBB"].includes(normalizedGame)) {
      throw new TeamServiceError(
        "Noto‘g‘ri o‘yin turi.",
        400,
        "INVALID_GAME",
      );
    }

    conditions.push("t.game = ?");
    parameters.push(normalizedGame);
  }

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

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
        t.captain_telegram_id AS captainTelegramId,
        t.league_tier AS leagueTier,
        t.league_assigned_at AS leagueAssignedAt,
        t.league_assigned_by AS leagueAssignedBy,
        t.status,
        t.created_at AS createdAt,
        t.updated_at AS updatedAt,
        COUNT(tm.id) AS memberCount,
        SUM(
          CASE
            WHEN tm.confirmation_status = 'CONFIRMED'
              THEN 1
            ELSE 0
          END
        ) AS confirmedCount,
        (
          SELECT tr.reason
          FROM team_reviews tr
          WHERE tr.team_id = t.id
          ORDER BY tr.created_at DESC
          LIMIT 1
        ) AS latestReason
      FROM teams t
      LEFT JOIN team_members tm
        ON tm.team_id = t.id
      ${where}
      GROUP BY t.id
      ORDER BY
        CASE t.status
          WHEN 'PENDING_REVIEW' THEN 1
          WHEN 'PENDING_CONFIRMATION' THEN 2
          WHEN 'DRAFT' THEN 3
          WHEN 'APPROVED' THEN 4
          WHEN 'REJECTED' THEN 5
          ELSE 6
        END,
        t.updated_at DESC
    `)
    .all(...parameters)
    .map((team) => ({
      ...team,
      memberCount: Number(team.memberCount || 0),
      confirmedCount: Number(team.confirmedCount || 0),
    }));
}

export function getAdminTeamDetails(teamId) {
  const team = getTeamById(teamId);

  const reviews = db
    .prepare(`
      SELECT
        id,
        decision,
        reason,
        admin_name AS adminName,
        created_at AS createdAt
      FROM team_reviews
      WHERE team_id = ?
      ORDER BY created_at DESC
    `)
    .all(teamId);

  return {
    ...team,
    reviews,
    eligibility: getTeamEligibility(teamId),
  };
}

export function approveTeam(
  teamId,
  {
    adminName,
  } = {},
) {
  const team = requireTeam(teamId);
  requirePendingReview(team);

  const validation =
    validateTeamForApproval(teamId);

  if (!validation.valid) {
    throw new TeamServiceError(
      [
        "Jamoani tasdiqlab bo‘lmaydi.",
        ...validation.errors,
      ].join(" "),
      409,
      "TEAM_APPROVAL_VALIDATION_FAILED",
    );
  }

  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      UPDATE teams
      SET
        status = 'APPROVED',
        updated_at = ?
      WHERE id = ?
    `).run(now, teamId);

    db.prepare(`
      INSERT INTO team_reviews (
        id,
        team_id,
        decision,
        reason,
        admin_name,
        created_at
      )
      VALUES (?, ?, 'APPROVED', '', ?, ?)
    `).run(
      randomUUID(),
      teamId,
      normalizeAdminName(adminName),
      now,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getAdminTeamDetails(teamId);
}

export function rejectTeam(
  teamId,
  {
    reason,
    adminName,
  } = {},
) {
  const team = requireTeam(teamId);
  requirePendingReview(team);

  const normalizedReason = cleanText(reason);

  if (
    normalizedReason.length < 5 ||
    normalizedReason.length > 500
  ) {
    throw new TeamServiceError(
      "Rad etish sababi 5–500 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_REJECTION_REASON",
    );
  }

  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      UPDATE teams
      SET
        status = 'REJECTED',
        updated_at = ?
      WHERE id = ?
    `).run(now, teamId);

    db.prepare(`
      INSERT INTO team_reviews (
        id,
        team_id,
        decision,
        reason,
        admin_name,
        created_at
      )
      VALUES (?, ?, 'REJECTED', ?, ?, ?)
    `).run(
      randomUUID(),
      teamId,
      normalizedReason,
      normalizeAdminName(adminName),
      now,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getAdminTeamDetails(teamId);
}
export function assignTeamLeague(
  teamId,
  {
    leagueTier,
    adminName,
  } = {},
) {
  const team = requireTeam(teamId);

  if (team.status !== "APPROVED") {
    throw new TeamServiceError(
      "Faqat tasdiqlangan jamoani ligaga biriktirish mumkin.",
      409,
      "TEAM_NOT_APPROVED",
    );
  }

  const normalizedTier =
    normalizeLeagueTier(
      team.game,
      leagueTier,
    );

  const normalizedAdmin =
    normalizeAdminName(adminName);

  const now =
    new Date().toISOString();

  db.prepare(`
    UPDATE teams
    SET
      league_tier = ?,
      league_assigned_at = ?,
      league_assigned_by = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    normalizedTier,
    now,
    normalizedAdmin,
    now,
    teamId,
  );

  return getAdminTeamDetails(teamId);
}