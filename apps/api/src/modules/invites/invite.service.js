import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@liga-arena/database";
import {
  TeamServiceError,
  getTeamById,
} from "../teams/team.service.js";

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeTelegramId(value) {
  const telegramId = cleanText(value);

  if (!/^\d+$/.test(telegramId)) {
    throw new TeamServiceError(
      "Telegram foydalanuvchisi aniqlanmadi.",
      400,
      "INVALID_TELEGRAM_ID",
    );
  }

  return telegramId;
}

function normalizeBotUsername(value) {
  const username = cleanText(value).replace(/^@/, "");

  if (!username) {
    throw new TeamServiceError(
      "Bot username sozlanmagan.",
      500,
      "BOT_USERNAME_NOT_CONFIGURED",
    );
  }

  return username;
}

function getInviteRecord(token) {
  return db
    .prepare(`
      SELECT
        mi.id,
        mi.team_id AS teamId,
        mi.member_id AS memberId,
        mi.token,
        mi.status,
        mi.expires_at AS expiresAt,
        mi.created_at AS createdAt,
        t.season,
        t.game,
        t.name AS teamName,
        t.tag AS teamTag,
        t.region,
        t.logo_url AS logoUrl,
        tm.first_name AS memberFirstName,
        tm.nickname AS memberNickname,
        tm.role AS memberRole,
        tm.confirmation_status AS confirmationStatus
      FROM member_invites mi
      JOIN teams t
        ON t.id = mi.team_id
      JOIN team_members tm
        ON tm.id = mi.member_id
      WHERE mi.token = ?
      LIMIT 1
    `)
    .get(token);
}

function ensureInviteExists(token) {
  const invite = getInviteRecord(token);

  if (!invite) {
    throw new TeamServiceError(
      "Tasdiqlash havolasi topilmadi.",
      404,
      "INVITE_NOT_FOUND",
    );
  }

  return invite;
}

function ensureInviteActive(invite) {
  if (invite.status !== "PENDING") {
    if (invite.status === "CONFIRMED") {
      throw new TeamServiceError(
        "Bu taklif allaqachon tasdiqlangan.",
        409,
        "INVITE_ALREADY_CONFIRMED",
      );
    }

    if (invite.status === "REJECTED") {
      throw new TeamServiceError(
        "Bu taklif rad etilgan.",
        409,
        "INVITE_REJECTED",
      );
    }

    throw new TeamServiceError(
      "Bu taklif endi faol emas.",
      410,
      "INVITE_INACTIVE",
    );
  }

  if (Date.parse(invite.expiresAt) <= Date.now()) {
    db.prepare(`
      UPDATE member_invites
      SET
        status = 'EXPIRED',
        updated_at = ?
      WHERE id = ?
    `).run(
      new Date().toISOString(),
      invite.id,
    );

    throw new TeamServiceError(
      "Tasdiqlash havolasining muddati tugagan.",
      410,
      "INVITE_EXPIRED",
    );
  }
}

export function createMemberInvite(
  teamId,
  memberId,
  botUsername,
) {
  const username = normalizeBotUsername(botUsername);

  const member = db
    .prepare(`
      SELECT
        tm.id,
        tm.team_id AS teamId,
        tm.role,
        tm.confirmation_status AS confirmationStatus,
        t.name AS teamName
      FROM team_members tm
      JOIN teams t
        ON t.id = tm.team_id
      WHERE
        tm.id = ?
        AND tm.team_id = ?
      LIMIT 1
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
      "Sardor allaqachon tasdiqlangan.",
      409,
      "CAPTAIN_ALREADY_CONFIRMED",
    );
  }

  if (member.confirmationStatus === "CONFIRMED") {
    throw new TeamServiceError(
      "Bu o‘yinchi allaqachon tarkibni tasdiqlagan.",
      409,
      "MEMBER_ALREADY_CONFIRMED",
    );
  }

  const inviteId = randomUUID();
  const token = randomBytes(16).toString("hex");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      DELETE FROM member_invites
      WHERE member_id = ?
    `).run(memberId);

    db.prepare(`
      UPDATE team_members
      SET confirmation_status = 'PENDING'
      WHERE id = ?
    `).run(memberId);

    db.prepare(`
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
        ?, ?, ?, ?, 'PENDING', ?, ?, ?
      )
    `).run(
      inviteId,
      teamId,
      memberId,
      token,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    inviteLink: `https://t.me/${username}?start=join_${token}`,
  };
}

export function getInvitePreview(token) {
  const invite = ensureInviteExists(token);

  if (
    invite.status === "PENDING" &&
    Date.parse(invite.expiresAt) <= Date.now()
  ) {
    db.prepare(`
      UPDATE member_invites
      SET
        status = 'EXPIRED',
        updated_at = ?
      WHERE id = ?
    `).run(
      new Date().toISOString(),
      invite.id,
    );

    invite.status = "EXPIRED";
  }

  return invite;
}

export function confirmMemberInvite(
  token,
  telegramUser = {},
) {
  const invite = ensureInviteExists(token);
  ensureInviteActive(invite);

  const telegramId = normalizeTelegramId(
    telegramUser.telegramId,
  );

  const firstName = cleanText(telegramUser.firstName);
  const username = cleanText(telegramUser.username)
    .replace(/^@/, "");

  const existingTelegramUser = db
    .prepare(`
      SELECT
        tm.id,
        t.name AS teamName
      FROM team_members tm
      JOIN teams t
        ON t.id = tm.team_id
      WHERE
        tm.season = ?
        AND tm.game = ?
        AND tm.telegram_id = ?
        AND tm.id != ?
      LIMIT 1
    `)
    .get(
      invite.season,
      invite.game,
      telegramId,
      invite.memberId,
    );

  if (existingTelegramUser) {
    throw new TeamServiceError(
      `Siz ushbu o‘yinda "${existingTelegramUser.teamName}" jamoasiga allaqachon biriktirilgansiz.`,
      409,
      "TELEGRAM_USER_ALREADY_REGISTERED",
    );
  }

  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      UPDATE team_members
      SET
        telegram_id = ?,
        first_name = CASE
          WHEN ? != '' THEN ?
          ELSE first_name
        END,
        username = ?,
        confirmation_status = 'CONFIRMED'
      WHERE id = ?
    `).run(
      telegramId,
      firstName,
      firstName,
      username,
      invite.memberId,
    );

    db.prepare(`
      UPDATE member_invites
      SET
        status = 'CONFIRMED',
        updated_at = ?
      WHERE id = ?
    `).run(
      now,
      invite.id,
    );

    db.prepare(`
      UPDATE teams
      SET
        status = 'PENDING_CONFIRMATION',
        updated_at = ?
      WHERE id = ?
    `).run(
      now,
      invite.teamId,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    message: "Jamoaga qo‘shilish tasdiqlandi.",
    invite: getInvitePreview(token),
    team: getTeamById(invite.teamId),
  };
}

export function rejectMemberInvite(token) {
  const invite = ensureInviteExists(token);
  ensureInviteActive(invite);

  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      UPDATE team_members
      SET confirmation_status = 'REJECTED'
      WHERE id = ?
    `).run(invite.memberId);

    db.prepare(`
      UPDATE member_invites
      SET
        status = 'REJECTED',
        updated_at = ?
      WHERE id = ?
    `).run(
      now,
      invite.id,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    message: "Jamoa taklifi rad etildi.",
    invite: getInvitePreview(token),
  };
}