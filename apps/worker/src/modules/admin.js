import {
  ApiError,
} from "../lib/http.js";

import {
  queryAll,
  queryFirst,
  requireDatabase,
} from "../lib/database.js";

import {
  getTeamById,
} from "./teams.js";

const allowedStatuses =
  new Set([
    "DRAFT",
    "PENDING_CONFIRMATION",
    "PENDING_REVIEW",
    "APPROVED",
    "REJECTED",
    "LOCKED",
  ]);

const leagueTiers = {
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
};

function cleanText(value) {
  return String(
    value ?? "",
  ).trim();
}

function normalizeAdminName(value) {
  const adminName =
    cleanText(value);

  if (
    adminName.length >
    100
  ) {
    throw new ApiError(
      "Admin ismi 100 belgidan oshmasligi kerak.",
      400,
      "INVALID_ADMIN_NAME",
    );
  }

  return adminName ||
    "Liga Arena Admin";
}

function normalizeTeamId(value) {
  const teamId =
    cleanText(value);

  if (!teamId) {
    throw new ApiError(
      "Jamoa ID topilmadi.",
      400,
      "TEAM_ID_REQUIRED",
    );
  }

  return teamId;
}

function normalizeStatus(value) {
  const status =
    cleanText(
      value ||
      "PENDING_REVIEW",
    ).toUpperCase();

  if (status === "ALL") {
    return "ALL";
  }

  if (
    !allowedStatuses.has(
      status,
    )
  ) {
    throw new ApiError(
      "Noto‘g‘ri jamoa holati.",
      400,
      "INVALID_TEAM_STATUS",
    );
  }

  return status;
}

function normalizeOptionalGame(value) {
  const game =
    cleanText(value)
      .toUpperCase();

  if (!game) {
    return "";
  }

  if (
    game !== "PUBG" &&
    game !== "MLBB"
  ) {
    throw new ApiError(
      "O‘yin turi PUBG yoki MLBB bo‘lishi kerak.",
      400,
      "INVALID_GAME",
    );
  }

  return game;
}

function normalizeRejectionReason(value) {
  const reason =
    cleanText(value);

  if (
    reason.length < 5 ||
    reason.length > 500
  ) {
    throw new ApiError(
      "Rad etish sababi 5–500 belgidan iborat bo‘lishi kerak.",
      400,
      "INVALID_REJECTION_REASON",
    );
  }

  return reason;
}

function normalizeLeagueTier(
  game,
  value,
) {
  const leagueTier =
    cleanText(value)
      .toUpperCase();

  if (
    !leagueTiers[
      game
    ]?.includes(
      leagueTier,
    )
  ) {
    throw new ApiError(
      "Tanlangan liga darajasi ushbu o‘yin uchun noto‘g‘ri.",
      400,
      "INVALID_LEAGUE_TIER",
    );
  }

  return leagueTier;
}

function constantTimeEqual(
  left,
  right,
) {
  const leftBytes =
    new TextEncoder()
      .encode(left);

  const rightBytes =
    new TextEncoder()
      .encode(right);

  let difference =
    leftBytes.length ^
    rightBytes.length;

  const length =
    Math.max(
      leftBytes.length,
      rightBytes.length,
    );

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    difference |=
      (
        leftBytes[index] ||
        0
      ) ^
      (
        rightBytes[index] ||
        0
      );
  }

  return difference === 0;
}

export function requireAdmin(
  request,
  env,
) {
  const configuredSecret =
    cleanText(
      env.ADMIN_SECRET,
    );

  const providedSecret =
    cleanText(
      request.headers.get(
        "X-Admin-Secret",
      ),
    );

  if (!configuredSecret) {
    throw new ApiError(
      "Admin maxfiy kaliti sozlanmagan.",
      503,
      "ADMIN_SECRET_NOT_CONFIGURED",
    );
  }

  if (
    !providedSecret ||
    !constantTimeEqual(
      providedSecret,
      configuredSecret,
    )
  ) {
    throw new ApiError(
      "Admin maxfiy kaliti noto‘g‘ri.",
      401,
      "ADMIN_UNAUTHORIZED",
    );
  }
}

function getStatusOrderSql() {
  return `
    CASE t.status
      WHEN 'PENDING_REVIEW'
        THEN 1
      WHEN 'PENDING_CONFIRMATION'
        THEN 2
      WHEN 'DRAFT'
        THEN 3
      WHEN 'APPROVED'
        THEN 4
      WHEN 'REJECTED'
        THEN 5
      ELSE 6
    END
  `;
}

export async function getAdminStats(
  env,
) {
  const database =
    requireDatabase(env);

  const [
    statusRows,
    gameRows,
  ] =
    await Promise.all([
      queryAll(
        database,
        `
          SELECT
            status,
            COUNT(*) AS count
          FROM teams
          GROUP BY status
        `,
      ),

      queryAll(
        database,
        `
          SELECT
            game,
            COUNT(*) AS count
          FROM teams
          GROUP BY game
        `,
      ),
    ]);

  const statuses = {
    DRAFT: 0,
    PENDING_CONFIRMATION: 0,
    PENDING_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    LOCKED: 0,
  };

  const games = {
    PUBG: 0,
    MLBB: 0,
  };

  for (
    const row of
    statusRows
  ) {
    if (
      Object.hasOwn(
        statuses,
        row.status,
      )
    ) {
      statuses[
        row.status
      ] =
        Number(
          row.count ||
          0,
        );
    }
  }

  for (
    const row of
    gameRows
  ) {
    if (
      Object.hasOwn(
        games,
        row.game,
      )
    ) {
      games[
        row.game
      ] =
        Number(
          row.count ||
          0,
        );
    }
  }

  return {
    statuses,
    games,

    total:
      Object.values(
        statuses,
      ).reduce(
        (
          sum,
          count,
        ) =>
          sum +
          count,
        0,
      ),
  };
}

export async function listAdminTeams(
  env,
  searchParams,
) {
  const database =
    requireDatabase(env);

  const status =
    normalizeStatus(
      searchParams.get(
        "status",
      ),
    );

  const game =
    normalizeOptionalGame(
      searchParams.get(
        "game",
      ),
    );

  const conditions = [];
  const parameters = [];

  if (status !== "ALL") {
    conditions.push(
      "t.status = ?",
    );

    parameters.push(
      status,
    );
  }

  if (game) {
    conditions.push(
      "t.game = ?",
    );

    parameters.push(
      game,
    );
  }

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(
          " AND ",
        )}`
      : "";

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

          t.status,

          t.created_at
            AS "createdAt",

          t.updated_at
            AS "updatedAt",

          COUNT(tm.id)
            AS "memberCount",

          COALESCE(
            SUM(
              CASE
                WHEN
                  tm.confirmation_status =
                    'CONFIRMED'
                  THEN 1
                ELSE 0
              END
            ),
            0
          )
            AS "confirmedCount",

          (
            SELECT
              tr.reason
            FROM team_reviews tr
            WHERE
              tr.team_id = t.id
            ORDER BY
              tr.created_at DESC
            LIMIT 1
          )
            AS "latestReason"

        FROM teams t

        LEFT JOIN team_members tm
          ON tm.team_id = t.id

        ${where}

        GROUP BY t.id

        ORDER BY
          ${getStatusOrderSql()},
          t.updated_at DESC
      `,
      parameters,
    );

  return teams.map(
    (team) => ({
      ...team,

      memberCount:
        Number(
          team.memberCount ||
          0,
        ),

      confirmedCount:
        Number(
          team.confirmedCount ||
          0,
        ),
    }),
  );
}

function buildEligibility(
  team,
) {
  const members =
    Array.isArray(
      team.members,
    )
      ? team.members.map(
          (member) => ({
            memberId:
              member.id,

            nickname:
              member.nickname,

            birthDate:
              member.birthDate,

            age:
              member.age,

            minimumAge:
              team.minimumAge,

            status:
              !Number.isInteger(
                member.age,
              )
                ? "MISSING"
                : member.eligible
                  ? "ELIGIBLE"
                  : "UNDERAGE",

            eligible:
              Boolean(
                member.eligible,
              ),
          }),
        )
      : [];

  return {
    minimumAge:
      team.minimumAge,

    allEligible:
      members.length > 0 &&
      members.every(
        (member) =>
          member.eligible,
      ),

    members,
  };
}

export async function getAdminTeam(
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
    await getTeamById(
      env,
      teamId,
    );

  const reviews =
    await queryAll(
      database,
      `
        SELECT
          id,
          decision,
          reason,

          admin_name
            AS "adminName",

          created_at
            AS "createdAt"

        FROM team_reviews

        WHERE team_id = ?

        ORDER BY
          created_at DESC
      `,
      [
        teamId,
      ],
    );

  return {
    ...team,
    reviews,

    eligibility:
      buildEligibility(
        team,
      ),
  };
}

function validateTeamForApproval(
  team,
) {
  const errors = [];
  const members =
    Array.isArray(
      team.members,
    )
      ? team.members
      : [];

  const counts =
    team.counts ||
    {};

  const limits =
    team.limits ||
    {};

  if (!team.logoUrl) {
    errors.push(
      "Jamoa logosi yuklanmagan.",
    );
  }

  if (!team.mediaConsent) {
    errors.push(
      "Media roziligi berilmagan.",
    );
  }

  if (!team.rulesConsent) {
    errors.push(
      "Liga shartlari tasdiqlanmagan.",
    );
  }

  if (
    Number(
      counts.mainCount ||
      0,
    ) !==
    Number(
      limits.main ||
      0,
    )
  ) {
    errors.push(
      `Asosiy tarkib ${limits.main || 0} nafar bo‘lishi kerak.`,
    );
  }

  if (
    team.game === "MLBB" &&
    Number(
      counts.reserveCount ||
      0,
    ) !==
    Number(
      limits.reserve ||
      0,
    )
  ) {
    errors.push(
      `MLBB uchun ${limits.reserve || 0} nafar zaxira o‘yinchi kerak.`,
    );
  }

  if (
    team.game === "PUBG" &&
    Number(
      counts.reserveCount ||
      0,
    ) >
    Number(
      limits.reserve ||
      0,
    )
  ) {
    errors.push(
      "PUBG zaxira tarkibi belgilangan limitdan oshgan.",
    );
  }

  if (
    Number(
      counts.total ||
      0,
    ) === 0 ||
    Number(
      counts.confirmedCount ||
      0,
    ) !==
    Number(
      counts.total ||
      0,
    )
  ) {
    errors.push(
      "Barcha o‘yinchilar Telegram orqali tasdiqlanishi kerak.",
    );
  }

  for (
    const member of
    members
  ) {
    const playerName =
      member.nickname ||
      member.fullName ||
      member.firstName ||
      "O‘yinchi";

    if (
      !cleanText(
        member.fullName,
      ).includes(" ")
    ) {
      errors.push(
        `${playerName}: ism-familiya to‘liq emas.`,
      );
    }

    if (
      !member.birthDate ||
      !Number.isInteger(
        member.age,
      )
    ) {
      errors.push(
        `${playerName}: tug‘ilgan sana kiritilmagan.`,
      );
    } else if (
      !member.eligible
    ) {
      errors.push(
        `${playerName}: minimal yosh talabiga mos emas.`,
      );
    }

    if (
      !cleanText(
        member.region,
      )
    ) {
      errors.push(
        `${playerName}: viloyat kiritilmagan.`,
      );
    }

    if (
      !/^\+998\d{9}$/.test(
        cleanText(
          member.phone,
        ),
      )
    ) {
      errors.push(
        `${playerName}: telefon raqami noto‘g‘ri.`,
      );
    }

    if (
      !cleanText(
        member.gameUserId,
      )
    ) {
      errors.push(
        `${playerName}: o‘yin ID kiritilmagan.`,
      );
    }

    if (
      team.game === "MLBB" &&
      !cleanText(
        member.serverId,
      )
    ) {
      errors.push(
        `${playerName}: server ID kiritilmagan.`,
      );
    }

    if (
      member.confirmationStatus !==
      "CONFIRMED"
    ) {
      errors.push(
        `${playerName}: Telegram tasdig‘i yo‘q.`,
      );
    }
  }

  return errors;
}

function requirePendingReview(
  team,
) {
  if (
    team.status !==
    "PENDING_REVIEW"
  ) {
    throw new ApiError(
      "Faqat admin tekshiruvidagi jamoaga qaror chiqarish mumkin.",
      409,
      "TEAM_NOT_PENDING_REVIEW",
    );
  }
}

async function telegramRequest(
  env,
  method,
  payload,
) {
  const token =
    cleanText(
      env.BOT_TOKEN,
    );

  if (!token) {
    return {
      ok: false,
      skipped: true,
      reason:
        "BOT_TOKEN_NOT_CONFIGURED",
    };
  }

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/${method}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.ok
    ) {
      return {
        ok: false,
        skipped: false,

        reason:
          result.description ||
          `Telegram HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      skipped: false,
      result:
        result.result,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,

      reason:
        error instanceof Error
          ? error.message
          : "Telegram xatosi",
    };
  }
}

async function notifyCaptainDecision(
  env,
  team,
  decision,
  reason = "",
) {
  const chatId =
    cleanText(
      team.captainTelegramId,
    );

  if (!chatId) {
    return {
      ok: false,
      skipped: true,
      reason:
        "CAPTAIN_TELEGRAM_ID_NOT_FOUND",
    };
  }

  const approved =
    decision ===
    "APPROVED";

  const text =
    approved
      ? [
          "✅ JAMOANGIZ TASDIQLANDI",
          "",
          `Jamoa: ${team.name}`,
          `TAG: ${team.tag}`,
          `O‘yin: ${team.game}`,
          "",
          "Jamoangiz Liga Arena admin tekshiruvidan muvaffaqiyatli o‘tdi.",
          "",
          "Keyingi bosqichda liga darajasi va turnir jadvali e’lon qilinadi.",
        ].join("\n")
      : [
          "❌ JAMOA ARIZASI RAD ETILDI",
          "",
          `Jamoa: ${team.name}`,
          `TAG: ${team.tag}`,
          "",
          `Sabab: ${reason}`,
          "",
          "Kamchiliklarni to‘g‘rilab, qayta ariza yuboring.",
        ].join("\n");

  const frontendUrl =
    cleanText(
      env.FRONTEND_URL,
    );

  const replyMarkup =
    frontendUrl.startsWith(
      "https://",
    )
      ? {
          inline_keyboard: [
            [
              {
                text:
                  "🏆 Liga Arenani ochish",

                web_app: {
                  url:
                    frontendUrl,
                },
              },
            ],
          ],
        }
      : undefined;

  return telegramRequest(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,

      text,

      ...(replyMarkup
        ? {
            reply_markup:
              replyMarkup,
          }
        : {}),
    },
  );
}

export async function approveAdminTeam(
  env,
  rawTeamId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const team =
    await getAdminTeam(
      env,
      rawTeamId,
    );

  requirePendingReview(
    team,
  );

  const errors =
    validateTeamForApproval(
      team,
    );

  if (
    errors.length > 0
  ) {
    throw new ApiError(
      [
        "Jamoani tasdiqlab bo‘lmaydi.",
        ...errors,
      ].join(" "),
      409,
      "TEAM_APPROVAL_VALIDATION_FAILED",
    );
  }

  const now =
    new Date()
      .toISOString();

  const adminName =
    normalizeAdminName(
      payload.adminName,
    );

  await database.batch([
    database
      .prepare(
        `
          UPDATE teams

          SET
            status =
              'APPROVED',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        team.id,
      ),

    database
      .prepare(
        `
          INSERT INTO team_reviews (
            id,
            team_id,
            decision,
            reason,
            admin_name,
            created_at
          )

          VALUES (
            ?,
            ?,
            'APPROVED',
            '',
            ?,
            ?
          )
        `,
      )
      .bind(
        crypto.randomUUID(),
        team.id,
        adminName,
        now,
      ),
  ]);

  const updatedTeam =
    await getAdminTeam(
      env,
      team.id,
    );

  const notification =
    await notifyCaptainDecision(
      env,
      updatedTeam,
      "APPROVED",
    );

  return {
    team:
      updatedTeam,

    notification,
  };
}

export async function rejectAdminTeam(
  env,
  rawTeamId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const team =
    await getAdminTeam(
      env,
      rawTeamId,
    );

  requirePendingReview(
    team,
  );

  const reason =
    normalizeRejectionReason(
      payload.reason,
    );

  const adminName =
    normalizeAdminName(
      payload.adminName,
    );

  const now =
    new Date()
      .toISOString();

  await database.batch([
    database
      .prepare(
        `
          UPDATE teams

          SET
            status =
              'REJECTED',

            updated_at = ?

          WHERE id = ?
        `,
      )
      .bind(
        now,
        team.id,
      ),

    database
      .prepare(
        `
          INSERT INTO team_reviews (
            id,
            team_id,
            decision,
            reason,
            admin_name,
            created_at
          )

          VALUES (
            ?,
            ?,
            'REJECTED',
            ?,
            ?,
            ?
          )
        `,
      )
      .bind(
        crypto.randomUUID(),
        team.id,
        reason,
        adminName,
        now,
      ),
  ]);

  const updatedTeam =
    await getAdminTeam(
      env,
      team.id,
    );

  const notification =
    await notifyCaptainDecision(
      env,
      updatedTeam,
      "REJECTED",
      reason,
    );

  return {
    team:
      updatedTeam,

    notification,
  };
}

export async function assignAdminTeamLeague(
  env,
  rawTeamId,
  payload = {},
) {
  const database =
    requireDatabase(env);

  const team =
    await getAdminTeam(
      env,
      rawTeamId,
    );

  if (
    team.status !==
    "APPROVED"
  ) {
    throw new ApiError(
      "Faqat tasdiqlangan jamoani ligaga biriktirish mumkin.",
      409,
      "TEAM_NOT_APPROVED",
    );
  }

  const leagueTier =
    normalizeLeagueTier(
      team.game,
      payload.leagueTier,
    );

  const adminName =
    normalizeAdminName(
      payload.adminName,
    );

  const now =
    new Date()
      .toISOString();

  await database
    .prepare(
      `
        UPDATE teams

        SET
          league_tier = ?,
          league_assigned_at = ?,
          league_assigned_by = ?,
          updated_at = ?

        WHERE id = ?
      `,
    )
    .bind(
      leagueTier,
      now,
      adminName,
      now,
      team.id,
    )
    .run();

  return {
    team:
      await getAdminTeam(
        env,
        team.id,
      ),
  };
}
