import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  listLeagueStandings,
  resetTeamStanding,
  saveTeamStanding,
} from "./standings.service.js";

function sendServiceError(
  reply,
  error,
) {
  if (
    error instanceof TeamServiceError
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
  const configuredSecret = String(
    process.env.ADMIN_SECRET || "",
  ).trim();

  const providedSecret = String(
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
      error: "ADMIN_UNAUTHORIZED",
      message:
        "Admin maxfiy kaliti noto‘g‘ri.",
    });
  }
}

export default async function standingsRoutes(
  app,
) {
  app.get(
    "/api/standings",
    async (request, reply) => {
      try {
        return {
          standings:
            listLeagueStandings(
              request.query,
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

  app.get(
    "/api/admin/standings",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        return {
          standings:
            listLeagueStandings(
              request.query,
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

  app.put(
    "/api/admin/standings/:teamId",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        const standings =
          saveTeamStanding(
            request.params.teamId,
            request.body || {},
          );

        return {
          message:
            "Jamoa natijalari saqlandi.",

          standings,
        };
      } catch (error) {
        return sendServiceError(
          reply,
          error,
        );
      }
    },
  );

  app.delete(
    "/api/admin/standings/:teamId",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        const standings =
          resetTeamStanding(
            request.params.teamId,
          );

        return {
          message:
            "Jamoa natijalari nolga qaytarildi.",

          standings,
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