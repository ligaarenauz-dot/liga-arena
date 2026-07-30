import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  activateNextSeason,
  getCurrentSeasonInfo,
  getSeasonReadiness,
} from "./season.service.js";

function sendServiceError(
  reply,
  error,
) {
  if (
    error instanceof
    TeamServiceError
  ) {
    return reply
      .status(error.statusCode)
      .send({
        error: error.code,
        message: error.message,
      });
  }

  throw error;
}

async function requireAdmin(
  request,
  reply,
) {
  const configuredSecret =
    String(
      process.env.ADMIN_SECRET ||
      "",
    ).trim();

  const providedSecret =
    String(
      request.headers[
        "x-admin-secret"
      ] || "",
    ).trim();

  if (!configuredSecret) {
    return reply.status(503).send({
      error:
        "ADMIN_SECRET_NOT_CONFIGURED",

      message:
        "Admin maxfiy kaliti sozlanmagan.",
    });
  }

  if (
    providedSecret !==
    configuredSecret
  ) {
    return reply.status(401).send({
      error:
        "ADMIN_UNAUTHORIZED",

      message:
        "Admin maxfiy kaliti noto‘g‘ri.",
    });
  }
}

export default async function seasonRoutes(
  app,
) {
  app.get(
    "/api/seasons/current",
    async () => {
      return getCurrentSeasonInfo();
    },
  );

  app.get(
    "/api/admin/seasons/readiness",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return getSeasonReadiness(
          request.query,
        );
      } catch (error) {
        return sendServiceError(
          reply,
          error,
        );
      }
    },
  );

  app.post(
    "/api/admin/seasons/activate",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "Keyingi mavsum muvaffaqiyatli faollashtirildi.",

          readiness:
            activateNextSeason(
              request.body || {},
            ),
        };
      } catch (error) {
        return sendServiceError(
          reply,
          error,
        );
      }
    },
  );
}