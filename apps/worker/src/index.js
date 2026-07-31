import {
  handleTournamentRequest,
} from "./modules/tournament-router.js";
import {
  getTelegramChannelStatus,
  handleTelegramWebhook,
} from "./modules/telegram.js";
import {
  ApiError,
  corsHeaders,
  errorResponse,
  jsonResponse,
  notFoundResponse,
} from "./lib/http.js";

import {
  requireDatabase,
} from "./lib/database.js";

import {
  getCurrentSeason,
} from "./modules/seasons.js";

import {
  addTeamMember,
  checkGameId,
  confirmMemberInvite,
  createMemberInvite,
  createTeam,
  getInvitePreview,
  getTeamById,
  listTeams,
  rejectMemberInvite,
  removeTeamMember,
  submitTeam,
} from "./modules/teams.js";

import {
  getTeamLogo,
  uploadTeamLogo,
} from "./modules/uploads.js";
import {
  approveAdminTeam,
  assignAdminTeamLeague,
  getAdminStats,
  getAdminTeam,
  listAdminTeams,
  rejectAdminTeam,
  requireAdmin,
} from "./modules/admin.js";

const MAX_JSON_BODY_BYTES =
  64 * 1024;

async function readJsonBody(
  request,
) {
  const contentType =
    String(
      request.headers.get(
        "content-type",
      ) || "",
    ).toLowerCase();

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    throw new ApiError(
      "So‘rov application/json formatida yuborilishi kerak.",
      415,
      "JSON_CONTENT_TYPE_REQUIRED",
    );
  }

  const text =
    await request.text();

  const byteLength =
    new TextEncoder()
      .encode(text)
      .byteLength;

  if (
    byteLength >
    MAX_JSON_BODY_BYTES
  ) {
    throw new ApiError(
      "So‘rov hajmi juda katta.",
      413,
      "JSON_BODY_TOO_LARGE",
    );
  }

  if (!text.trim()) {
    throw new ApiError(
      "So‘rov ma’lumotlari bo‘sh.",
      400,
      "EMPTY_JSON_BODY",
    );
  }

  let payload;

  try {
    payload =
      JSON.parse(text);
  } catch {
    throw new ApiError(
      "JSON ma’lumotlari noto‘g‘ri.",
      400,
      "INVALID_JSON_BODY",
    );
  }

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

  return payload;
}

function getLogoFilenameFromPath(
  pathname,
) {
  const match =
    pathname.match(
      /^\/uploads\/team-logos\/([^/]+)$/,
    );

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(
      match[1],
    );
  } catch {
    return match[1];
  }
}

function getTeamIdFromPath(
  pathname,
) {
  const match =
    pathname.match(
      /^\/api\/teams\/([^/]+)$/,
    );

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(
      match[1],
    );
  } catch {
    return match[1];
  }
}

async function getHealth(
  env,
) {
  const database =
    requireDatabase(env);

  const probe =
    await database
      .prepare(
        "SELECT 1 AS ok",
      )
      .first();

  return {
    healthy:
      probe?.ok === 1,

    app:
      "Liga Arena",

    service:
      "Cloudflare Worker API",

    database: {
      connected:
        probe?.ok === 1,

      name:
        "liga-arena-db",

      probe:
        probe?.ok ??
        null,
    },

    timestamp:
      new Date()
        .toISOString(),
  };
}

export default {
  async fetch(
    request,
    env,
  ) {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status: 204,
          headers:
            corsHeaders,
        },
      );
    }

    const url =
      new URL(
        request.url,
      );

    try {
      if (
        request.method ===
          "POST" &&
        url.pathname ===
          "/telegram/webhook"
      ) {
        return await handleTelegramWebhook(
          request,
          env,
        );
      }

      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/telegram/webhook"
      ) {
        return jsonResponse({
          healthy: true,

          service:
            "Liga Arena Telegram webhook",

          configured:
            Boolean(
              env.BOT_TOKEN &&
              env.TELEGRAM_WEBHOOK_SECRET &&
              env.FRONTEND_URL,
            ),

          frontendUrl:
            env.FRONTEND_URL || "",
        });
      }

      if (
        request.method ===
          "GET" &&
        url.pathname === "/"
      ) {
        return jsonResponse({
          app:
            "Liga Arena Cloudflare Worker",

          status:
            "online",

          platform:
            "Cloudflare Workers",

          endpoints: [
            "/api/health",
            "/api/db-test",
            "/api/seasons/current",
            "/api/eligibility/rules",
            "/api/schedule",
            "/api/standings",
            "/api/competition/standings",
            "/api/mlbb/standings",
            "/api/archive/seasons",
            "/api/archive/standings",
            "/api/teams",
            "/api/teams/:teamId",
            "POST /api/teams",
            "POST /api/teams/:teamId/members",
            "DELETE /api/teams/:teamId/members/:memberId",
            "POST /api/teams/:teamId/members/:memberId/invite",
            "GET /api/invites/:token",
            "POST /api/invites/:token/confirm",
            "POST /api/invites/:token/reject",
            "POST /api/teams/:teamId/submit",
            "/api/uploads/team-logo",
            "/uploads/team-logos/:filename",
          ],
        });
      }

      if (
        request.method ===
          "GET" &&
        (
          url.pathname ===
            "/api/health" ||
          url.pathname ===
            "/api/db-test"
        )
      ) {
        return jsonResponse(
          await getHealth(
            env,
          ),
        );
      }

      if (
        request.method ===
          "POST" &&
        url.pathname ===
          "/api/uploads/team-logo"
      ) {
        return jsonResponse(
          await uploadTeamLogo(
            request,
            env,
          ),
          201,
        );
      }

      if (
        request.method ===
        "GET"
      ) {
        const logoFilename =
          getLogoFilenameFromPath(
            url.pathname,
          );

        if (logoFilename) {
          return await getTeamLogo(
            env,
            logoFilename,
          );
        }
      }

      if (
        request.method ===
          "GET" &&
        (
          url.pathname ===
            "/api/seasons/current" ||
          url.pathname ===
            "/api/season/current"
        )
      ) {
        return jsonResponse(
          await getCurrentSeason(
            env,
          ),
        );
      }

      const tournamentResponse =
        await handleTournamentRequest(
          request,
          env,
          url,
          readJsonBody,
        );

      if (tournamentResponse) {
        return tournamentResponse;
      }

      if (
        url.pathname.startsWith(
          "/api/admin/",
        )
      ) {
        requireAdmin(
          request,
          env,
        );
      }

      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/api/admin/stats"
      ) {
        return jsonResponse({
          stats:
            await getAdminStats(
              env,
            ),
        });
      }

      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/api/admin/channel-status"
      ) {
        return jsonResponse(
          await getTelegramChannelStatus(
            env,
          ),
        );
      }

      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/api/admin/teams"
      ) {
        return jsonResponse({
          teams:
            await listAdminTeams(
              env,
              url.searchParams,
            ),
        });
      }

      const adminApproveMatch =
        url.pathname.match(
          /^\/api\/admin\/teams\/([^/]+)\/approve$/,
        );

      if (
        request.method ===
          "POST" &&
        adminApproveMatch
      ) {
        const payload =
          await readJsonBody(
            request,
          );

        const result =
          await approveAdminTeam(
            env,

            decodeURIComponent(
              adminApproveMatch[1],
            ),

            payload,
          );

        return jsonResponse({
          message:
            "Jamoa tasdiqlandi.",

          ...result,
        });
      }

      const adminRejectMatch =
        url.pathname.match(
          /^\/api\/admin\/teams\/([^/]+)\/reject$/,
        );

      if (
        request.method ===
          "POST" &&
        adminRejectMatch
      ) {
        const payload =
          await readJsonBody(
            request,
          );

        const result =
          await rejectAdminTeam(
            env,

            decodeURIComponent(
              adminRejectMatch[1],
            ),

            payload,
          );

        return jsonResponse({
          message:
            "Jamoa rad etildi.",

          ...result,
        });
      }

      const adminLeagueMatch =
        url.pathname.match(
          /^\/api\/admin\/teams\/([^/]+)\/league$/,
        );

      if (
        request.method ===
          "POST" &&
        adminLeagueMatch
      ) {
        const payload =
          await readJsonBody(
            request,
          );

        const result =
          await assignAdminTeamLeague(
            env,

            decodeURIComponent(
              adminLeagueMatch[1],
            ),

            payload,
          );

        return jsonResponse({
          message:
            "Jamoa liga darajasiga biriktirildi.",

          ...result,
        });
      }

      const adminTeamMatch =
        url.pathname.match(
          /^\/api\/admin\/teams\/([^/]+)$/,
        );

      if (
        request.method ===
          "GET" &&
        adminTeamMatch
      ) {
        return jsonResponse({
          team:
            await getAdminTeam(
              env,

              decodeURIComponent(
                adminTeamMatch[1],
              ),
            ),
        });
      }
      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/api/teams"
      ) {
        return jsonResponse(
          await listTeams(
            env,
            url.searchParams,
          ),
        );
      }

      if (
        request.method ===
          "POST" &&
        url.pathname ===
          "/api/teams"
      ) {
        const payload =
          await readJsonBody(
            request,
          );

        const team =
          await createTeam(
            env,
            payload,
          );

        return jsonResponse(
          {
            message:
              "Jamoa yaratildi.",

            team,
          },
          201,
        );
      }

      const createInviteMatch =
        url.pathname.match(
          /^\/api\/teams\/([^/]+)\/members\/([^/]+)\/invite$/,
        );

      if (
        request.method ===
          "POST" &&
        createInviteMatch
      ) {
        const result =
          await createMemberInvite(
            env,

            decodeURIComponent(
              createInviteMatch[1],
            ),

            decodeURIComponent(
              createInviteMatch[2],
            ),
          );

        return jsonResponse(
          {
            message:
              "Tasdiqlash havolasi yaratildi.",

            ...result,
          },
          201,
        );
      }

      const confirmInviteMatch =
        url.pathname.match(
          /^\/api\/invites\/([^/]+)\/confirm$/,
        );

      if (
        request.method ===
          "POST" &&
        confirmInviteMatch
      ) {
        const payload =
          await readJsonBody(
            request,
          );

        return jsonResponse(
          await confirmMemberInvite(
            env,

            decodeURIComponent(
              confirmInviteMatch[1],
            ),

            payload,
          ),
        );
      }

      const rejectInviteMatch =
        url.pathname.match(
          /^\/api\/invites\/([^/]+)\/reject$/,
        );

      if (
        request.method ===
          "POST" &&
        rejectInviteMatch
      ) {
        return jsonResponse(
          await rejectMemberInvite(
            env,

            decodeURIComponent(
              rejectInviteMatch[1],
            ),
          ),
        );
      }

      const invitePreviewMatch =
        url.pathname.match(
          /^\/api\/invites\/([^/]+)$/,
        );

      if (
        request.method ===
          "GET" &&
        invitePreviewMatch
      ) {
        return jsonResponse({
          invite:
            await getInvitePreview(
              env,

              decodeURIComponent(
                invitePreviewMatch[1],
              ),
            ),
        });
      }

      const submitTeamMatch =
        url.pathname.match(
          /^\/api\/teams\/([^/]+)\/submit$/,
        );

      if (
        request.method ===
          "POST" &&
        submitTeamMatch
      ) {
        const team =
          await submitTeam(
            env,

            decodeURIComponent(
              submitTeamMatch[1],
            ),
          );

        return jsonResponse({
          message:
            "Jamoa admin tekshiruviga yuborildi.",

          team,
        });
      }

      const addMemberMatch =
        url.pathname.match(
          /^\/api\/teams\/([^/]+)\/members$/,
        );

      if (
        request.method ===
          "POST" &&
        addMemberMatch
      ) {
        const payload =
          await readJsonBody(
            request,
          );

        const team =
          await addTeamMember(
            env,
            decodeURIComponent(
              addMemberMatch[1],
            ),
            payload,
          );

        return jsonResponse(
          {
            message:
              "O‘yinchi jamoaga qo‘shildi.",

            team,
          },
          201,
        );
      }

      const removeMemberMatch =
        url.pathname.match(
          /^\/api\/teams\/([^/]+)\/members\/([^/]+)$/,
        );

      if (
        request.method ===
          "DELETE" &&
        removeMemberMatch
      ) {
        const team =
          await removeTeamMember(
            env,

            decodeURIComponent(
              removeMemberMatch[1],
            ),

            decodeURIComponent(
              removeMemberMatch[2],
            ),
          );

        return jsonResponse({
          message:
            "O‘yinchi tarkibdan olib tashlandi.",

          team,
        });
      }
      /*
       * Bu route generic teamId route
       * tomonidan ushlanmasligi kerak.
       */
      if (
        request.method ===
          "GET" &&
        url.pathname ===
          "/api/teams/check-id"
      ) {
        return jsonResponse(
          await checkGameId(
            env,
            url.searchParams,
          ),
        );
      }

      if (
        request.method ===
        "GET"
      ) {
        const teamId =
          getTeamIdFromPath(
            url.pathname,
          );

        if (teamId) {
          return jsonResponse(
            await getTeamById(
              env,
              teamId,
            ),
          );
        }
      }

      return notFoundResponse(
        url.pathname,
      );
    } catch (error) {
      return errorResponse(
        error,
      );
    }
  },
};