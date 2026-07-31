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
  createTeam,
  getTeamById,
  listTeams,
  removeTeamMember,
} from "./modules/teams.js";

import {
  getTeamLogo,
  uploadTeamLogo,
} from "./modules/uploads.js";

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
            "/api/teams",
            "/api/teams/:teamId",
            "POST /api/teams",
            "POST /api/teams/:teamId/members",
            "DELETE /api/teams/:teamId/members/:memberId",
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