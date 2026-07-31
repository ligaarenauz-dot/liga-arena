import {
  ApiError,
  cleanText,
  execute,
  inputValue,
  queryAll,
  queryFirst,
  requireDatabase,
} from "./tournament-utils.js";

const DEFAULT_MINIMUM_AGE = 16;

function getConfiguredAge(
  env,
  game,
) {
  const rawValue =
    Number.parseInt(
      game === "MLBB"
        ? env.MLBB_MIN_AGE
        : env.PUBG_MIN_AGE,
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

function calculateAge(
  birthDate,
  comparisonDate = new Date(),
) {
  if (!birthDate) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = birthDate
    .split("-")
    .map(Number);

  let age =
    comparisonDate.getUTCFullYear() -
    year;

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

function parseBirthDate(value) {
  const normalizedValue =
    cleanText(value);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue,
    )
  ) {
    throw new ApiError(
      "Tug‘ilgan sana YYYY-MM-DD formatida bo‘lishi kerak.",
      400,
      "INVALID_BIRTH_DATE_FORMAT",
    );
  }

  const [
    year,
    month,
    day,
  ] = normalizedValue
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ApiError(
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
    throw new ApiError(
      "Tug‘ilgan sana kelajakda bo‘lishi mumkin emas.",
      400,
      "BIRTH_DATE_IN_FUTURE",
    );
  }

  const age =
    calculateAge(
      normalizedValue,
      today,
    );

  if (age > 100) {
    throw new ApiError(
      "Tug‘ilgan sana haqiqiy emas.",
      400,
      "BIRTH_DATE_TOO_OLD",
    );
  }

  return normalizedValue;
}

async function requireTeam(
  env,
  teamId,
) {
  const database =
    requireDatabase(env);

  const team =
    await queryFirst(
      database,
      `
        SELECT
          id,
          game,
          status
        FROM teams
        WHERE id = ?
        LIMIT 1
      `,
      [
        cleanText(teamId),
      ],
    );

  if (!team) {
    throw new ApiError(
      "Jamoa topilmadi.",
      404,
      "TEAM_NOT_FOUND",
    );
  }

  return team;
}

async function requireMember(
  env,
  teamId,
  memberId,
) {
  const database =
    requireDatabase(env);

  const member =
    await queryFirst(
      database,
      `
        SELECT
          id,
          team_id AS teamId,
          nickname,
          role
        FROM team_members
        WHERE
          id = ?
          AND team_id = ?
        LIMIT 1
      `,
      [
        cleanText(memberId),
        cleanText(teamId),
      ],
    );

  if (!member) {
    throw new ApiError(
      "O‘yinchi jamoa tarkibidan topilmadi.",
      404,
      "TEAM_MEMBER_NOT_FOUND",
    );
  }

  return member;
}

function requireEditableTeam(team) {
  const editableStatuses =
    new Set([
      "DRAFT",
      "PENDING_CONFIRMATION",
      "REJECTED",
    ]);

  if (
    !editableStatuses.has(
      team.status,
    )
  ) {
    throw new ApiError(
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
  const birthDate =
    row.birthDate || null;

  if (!birthDate) {
    return {
      memberId:
        row.memberId,

      nickname:
        row.nickname,

      role:
        row.role,

      birthDate:
        null,

      age:
        null,

      minimumAge,

      status:
        "MISSING",

      eligible:
        false,
    };
  }

  const age =
    calculateAge(
      birthDate,
    );

  const eligible =
    age >= minimumAge;

  return {
    memberId:
      row.memberId,

    nickname:
      row.nickname,

    role:
      row.role,

    birthDate,
    age,
    minimumAge,

    status:
      eligible
        ? "ELIGIBLE"
        : "UNDERAGE",

    eligible,
  };
}

export function getEligibilityRules(env) {
  return {
    PUBG: {
      minimumAge:
        getConfiguredAge(
          env,
          "PUBG",
        ),
    },

    MLBB: {
      minimumAge:
        getConfiguredAge(
          env,
          "MLBB",
        ),
    },
  };
}

export async function getTeamEligibility(
  env,
  teamId,
) {
  const team =
    await requireTeam(
      env,
      teamId,
    );

  const database =
    requireDatabase(env);

  const minimumAge =
    getConfiguredAge(
      env,
      team.game,
    );

  const rows =
    await queryAll(
      database,
      `
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
      `,
      [
        cleanText(teamId),
      ],
    );

  const members =
    rows.map(
      (row) =>
        buildEligibilityMember(
          row,
          minimumAge,
        ),
    );

  const eligibleCount =
    members.filter(
      (member) =>
        member.eligible,
    ).length;

  const underageCount =
    members.filter(
      (member) =>
        member.status ===
        "UNDERAGE",
    ).length;

  const missingCount =
    members.filter(
      (member) =>
        member.status ===
        "MISSING",
    ).length;

  return {
    teamId:
      cleanText(teamId),

    game:
      team.game,

    minimumAge,
    members,

    counts: {
      total:
        members.length,

      eligible:
        eligibleCount,

      underage:
        underageCount,

      missing:
        missingCount,
    },

    allEligible:
      members.length > 0 &&
      eligibleCount ===
        members.length,
  };
}

export async function saveMemberEligibility(
  env,
  teamId,
  memberId,
  source = {},
) {
  const team =
    await requireTeam(
      env,
      teamId,
    );

  requireEditableTeam(
    team,
  );

  await requireMember(
    env,
    teamId,
    memberId,
  );

  const database =
    requireDatabase(env);

  const normalizedBirthDate =
    cleanText(
      inputValue(
        source,
        "birthDate",
        "",
      ),
    );

  if (!normalizedBirthDate) {
    await execute(
      database,
      `
        DELETE FROM member_eligibility
        WHERE member_id = ?
      `,
      [
        cleanText(memberId),
      ],
    );

    return getTeamEligibility(
      env,
      teamId,
    );
  }

  const validBirthDate =
    parseBirthDate(
      normalizedBirthDate,
    );

  const now =
    new Date()
      .toISOString();

  await execute(
    database,
    `
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
    `,
    [
      cleanText(memberId),
      validBirthDate,
      now,
      now,
    ],
  );

  return getTeamEligibility(
    env,
    teamId,
  );
}
