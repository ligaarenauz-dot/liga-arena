import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  sendPubgRoundNotifications,
} from "../../services/round-telegram-notifier.js";

import {
  completeCompetitionRound,
  createCompetitionRound,
  deleteCompetitionRound,
  finalizeCompetitionSeason,
  getCompetitionOverview,
  getCompetitionRound,
  getCompetitionStandings,
  saveCompetitionSettings,
  saveCompetitionTeamResults,
} from "./competition.service.js";

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

export default async function competitionRoutes(
  app,
) {
  app.get(
    "/api/competition/standings",

    async (request, reply) => {
      try {
        return getCompetitionStandings(
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
    "/api/admin/competition/overview",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return getCompetitionOverview(
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
    "/api/admin/competition/settings",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "Musobaqa sozlamalari saqlandi.",

          settings:
            saveCompetitionSettings(
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
    "/api/admin/competition/rounds",

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
              "Yangi tur yaratildi.",

            round:
              createCompetitionRound(
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
    "/api/admin/competition/rounds/:roundId",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          round:
            getCompetitionRound(
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
    "/api/admin/competition/rounds/:roundId/teams/:teamId",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "Jamoaning 4 ta karta natijasi saqlandi.",

          round:
            saveCompetitionTeamResults(
              request.params.roundId,
              request.params.teamId,
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
    "/api/admin/competition/rounds/:roundId/complete",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "Tur yakunlandi.",

          round:
            completeCompetitionRound(
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
    "/api/admin/competition/rounds/:roundId",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "Tur o‘chirildi.",

          result:
            deleteCompetitionRound(
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
    "/api/admin/competition/rounds/:roundId/notify",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "PUBG tur bildirishnomalari qayta ishlandi.",

          summary:
            await sendPubgRoundNotifications(
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
    "/api/admin/competition/finalize",

    {
      preHandler:
        requireAdmin,
    },

    async (request, reply) => {
      try {
        return {
          message:
            "PUBG saralashi rasmiy yakunlandi va keyingi mavsum ligalari belgilandi.",

          overview:
            finalizeCompetitionSeason(
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