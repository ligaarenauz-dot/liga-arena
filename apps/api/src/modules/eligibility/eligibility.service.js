import { db } from "@liga-arena/database";
import {
  TeamServiceError,
  getTeamById,
} from "../teams/team.service.js";

const DEFAULT_MINIMUM_AGE = 16;

function cleanText(value) {
  return String(value ?? "").trim();
}

function getConfiguredAge(game) {
  const environmentName =
    game === "MLBB"
      ? "MLBB_MIN_AGE"
      : "PUBG_MIN_AGE";

  const rawValue = Number.parseInt(
    process.env[environmentName],
    10,
  );

  if (
    Number.isInteger(rawValue) &&
    rawValue >= 5 &&
    rawValue <= 99
  ) {
    return rawValue;
  }

  return DEFAULT_MINIMUM_AGE;
}

function parseBirthDate(value) {
  const normalizedValue = cleanText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new TeamServiceError(
      "Tug‘ilgan sana YYYY-MM-DD formatida bo‘lishi kerak.",
      400,
      "INVALID_BIRTH_DATE_FORMAT",
    );
  }

  const [year, month, day] = normalizedValue
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TeamServiceError(
      "Tug‘ilgan sana noto‘g‘ri.",
      400,
      "INVALID_BIRTH_DATE",
    );
  }

  const now = new Date();

  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );

  if (date > today) {
    throw new TeamServiceError(
      "Tug‘ilgan sana kelajakda bo‘lishi mumkin emas.",
      400,
      "BIRTH_DATE_IN_FUTURE",
    );
  }

  const age = calculateAge(
    normalizedValue,
    today,
  );

  if (age > 100) {
    throw new TeamServiceError(
      "Tug‘ilgan sana haqiqiy emas.",
      400,
      "BIRTH_DATE_TOO_OLD",
    );
  }

  return normalizedValue;
}

export function calculateAge(
  birthDate,
  comparisonDate = new Date(),
) {
  if (!birthDate) {
    return null;
  }

  const [year, month, day] = birthDate
    .split("-")
    .map(Number);

  let age =
    comparisonDate.getUTCFullYear() - year;

  const comparisonMonth =
    comparisonDate.getUTCMonth() + 1;

  const comparisonDay =
    comparisonDate.getUTCDate();

  if (
    comparisonMonth < month ||
    (
      comparisonMonth === month &&
      comparisonDay < day
    )
  ) {
    age -= 1;
  }

  return age;
}

function requireTeam(teamId) {
  const team = db
    .prepare(`
      SELECT
        id,
        game,
        status
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

  return team;
}

function requireMember(teamId, memberId) {
  const member = db
    .prepare(`
      SELECT
        id,
        team_id AS teamId,
        nickname,
        role
      FROM team_members
      WHERE
        id = ?
        AND team_id = ?
    `)
    .get(memberId, teamId);

  if (!member) {
    throw new TeamServiceError(
      "O‘yinchi jamoa tarkibidan topilmadi.",
      404,
      "TEAM_MEMBER_NOT_FOUND",
    );
  }

  return member;
}

function requireEditableTeam(team) {
  const editableStatuses = new Set([
    "DRAFT",
    "PENDING_CONFIRMATION",
    "REJECTED",
  ]);

  if (!editableStatuses.has(team.status)) {
    throw new TeamServiceError(
      "Bu holatdagi jamoaning yosh ma’lumotlarini o‘zgartirib bo‘lmaydi.",
      409,
      "TEAM_NOT_EDITABLE",
    );
  }
}

function buildEligibilityMember(
  row,
  minimumAge,
) {
  const birthDate = row.birthDate || null;

  if (!birthDate) {
    return {
      memberId: row.memberId,
      nickname: row.nickname,
      role: row.role,
      birthDate: null,
      age: null,
      minimumAge,
      status: "MISSING",
      eligible: false,
    };
  }

  const age = calculateAge(birthDate);
  const eligible = age >= minimumAge;

  return {
    memberId: row.memberId,
    nickname: row.nickname,
    role: row.role,
    birthDate,
    age,
    minimumAge,
    status: eligible
      ? "ELIGIBLE"
      : "UNDERAGE",
    eligible,
  };
}

export function getEligibilityRules() {
  return {
    PUBG: {
      minimumAge: getConfiguredAge("PUBG"),
    },
    MLBB: {
      minimumAge: getConfiguredAge("MLBB"),
    },
  };
}

export function getTeamEligibility(teamId) {
  const team = getTeamById(teamId);

  const minimumAge = getConfiguredAge(team.game);

  const rows = db
    .prepare(`
      SELECT
        tm.id AS memberId,
        tm.nickname,
        tm.role,
        me.birth_date AS birthDate
      FROM team_members tm
      LEFT JOIN member_eligibility me
        ON me.member_id = tm.id
      WHERE tm.team_id = ?
      ORDER BY
        CASE tm.role
          WHEN 'CAPTAIN' THEN 1
          WHEN 'MAIN' THEN 2
          WHEN 'RESERVE' THEN 3
          ELSE 4
        END,
        tm.created_at ASC
    `)
    .all(teamId);

  const members = rows.map((row) =>
    buildEligibilityMember(
      row,
      minimumAge,
    ),
  );

  const eligibleCount = members.filter(
    (member) => member.eligible,
  ).length;

  const underageCount = members.filter(
    (member) =>
      member.status === "UNDERAGE",
  ).length;

  const missingCount = members.filter(
    (member) =>
      member.status === "MISSING",
  ).length;

  return {
    teamId,
    game: team.game,
    minimumAge,
    members,
    counts: {
      total: members.length,
      eligible: eligibleCount,
      underage: underageCount,
      missing: missingCount,
    },
    allEligible:
      members.length > 0 &&
      eligibleCount === members.length,
  };
}

export function saveMemberEligibility(
  teamId,
  memberId,
  {
    birthDate,
  } = {},
) {
  const team = requireTeam(teamId);

  requireEditableTeam(team);
  requireMember(teamId, memberId);

  const normalizedBirthDate =
    cleanText(birthDate);

  if (!normalizedBirthDate) {
    db.prepare(`
      DELETE FROM member_eligibility
      WHERE member_id = ?
    `).run(memberId);

    return getTeamEligibility(teamId);
  }

  const validBirthDate =
    parseBirthDate(normalizedBirthDate);

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO member_eligibility (
      member_id,
      birth_date,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(member_id)
    DO UPDATE SET
      birth_date = excluded.birth_date,
      updated_at = excluded.updated_at
  `).run(
    memberId,
    validBirthDate,
    now,
    now,
  );

  return getTeamEligibility(teamId);
}

export function assertTeamEligibility(teamId) {
  const eligibility =
    getTeamEligibility(teamId);

  if (eligibility.counts.missing > 0) {
    throw new TeamServiceError(
      `${eligibility.counts.missing} ta o‘yinchining tug‘ilgan sanasi kiritilmagan.`,
      409,
      "MEMBER_BIRTH_DATE_MISSING",
    );
  }

  if (eligibility.counts.underage > 0) {
    const underagePlayers =
      eligibility.members
        .filter(
          (member) =>
            member.status === "UNDERAGE",
        )
        .map(
          (member) =>
            `${member.nickname} (${member.age} yosh)`,
        )
        .join(", ");

    throw new TeamServiceError(
      `Yosh chegarasiga mos kelmaydigan o‘yinchilar: ${underagePlayers}. Minimal yosh: ${eligibility.minimumAge}.`,
      409,
      "TEAM_HAS_UNDERAGE_MEMBERS",
    );
  }

  return eligibility;
}