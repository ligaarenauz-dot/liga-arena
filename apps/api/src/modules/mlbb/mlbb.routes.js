import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  sendMlbbRoundNotifications,
} from "../../services/round-telegram-notifier.js";

import {
  completeMlbbRound,
  createMlbbRound,
  deleteMlbbRound,
  finalizeMlbbSeason,
  getMlbbOverview,
  getMlbbRound,
  getMlbbStandings,
  saveMlbbMatchResult,
  saveMlbbSettings,
} from "./mlbb.service.js";

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
  const configured =
    String(
      process.env.ADMIN_SECRET ||
      "",
    ).trim();

  const provided =
    String(
      request.headers[
        "x-admin-secret"
      ] || "",
    ).trim();

  if (!configured) {
    return reply.status(503).send({
      error:
        "ADMIN_SECRET_NOT_CONFIGURED",

      message:
        "Admin maxfiy kaliti sozlanmagan.",
    });
  }

  if (
    configured !==
    provided
  ) {
    return reply.status(401).send({
      error:
        "ADMIN_UNAUTHORIZED",

      message:
        "Admin maxfiy kaliti noto‘g‘ri.",
    });
  }
}

export default async function mlbbRoutes(
  app,
) {
  app.get(
    "/api/mlbb/standings",

    async (request, reply) => {
      try {
        return getMlbbStandings(
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

  app.get(
    "/api/admin/mlbb/overview",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return getMlbbOverview(
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

  app.put(
    "/api/admin/mlbb/settings",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "MLBB sozlamalari saqlandi.",

          settings:
            saveMlbbSettings(
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

  app.post(
    "/api/admin/mlbb/rounds",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return reply
          .status(201)
          .send({
            message:
              "MLBB turi yaratildi.",

            round:
              createMlbbRound(
                request.body || {},
              ),
          });
      } catch (error) {
        return sendServiceError(
          reply,
          error,
        );
      }
    },
  );

  app.get(
    "/api/admin/mlbb/rounds/:roundId",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          round:
            getMlbbRound(
              request.params.roundId,
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
    "/api/admin/mlbb/matches/:matchId",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "MLBB seriya natijasi saqlandi.",

          round:
            saveMlbbMatchResult(
              request.params.matchId,
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

  app.post(
    "/api/admin/mlbb/rounds/:roundId/complete",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "MLBB turi jadvalga chiqarildi.",

          round:
            completeMlbbRound(
              request.params.roundId,
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

  app.delete(
    "/api/admin/mlbb/rounds/:roundId",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "MLBB turi o‘chirildi.",

          result:
            deleteMlbbRound(
              request.params.roundId,
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

  app.post(
    "/api/admin/mlbb/finalize",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "MLBB mavsumi yakunlandi va keyingi mavsum ligalari belgilandi.",

          overview:
            finalizeMlbbSeason(
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
  app.post(
    "/api/admin/mlbb/rounds/:roundId/notify",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "MLBB tur bildirishnomalari qayta ishlandi.",

          summary:
            await sendMlbbRoundNotifications(
              request.params.roundId,
            ),
        };
      } catch (error) {
        return sendServiceError(
          reply,
          error,
        );
      }
    },
  );}