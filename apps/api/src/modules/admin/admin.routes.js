import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  getAdminStats,
  getAdminTeamDetails,
  listAdminTeams,
  approveTeam,
  rejectTeam,
  assignTeamLeague,
} from "./admin.service.js";

import {
  notifyCaptainReviewDecision,
} from "../../services/telegram-notifier.js";

function sendServiceError(reply, error) {
  if (error instanceof TeamServiceError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  throw error;
}

export default async function adminRoutes(app) {
  app.addHook("onRequest", async (request, reply) => {
    const configuredSecret = String(
      process.env.ADMIN_SECRET || "",
    ).trim();

    const providedSecret = String(
      request.headers["x-admin-secret"] || "",
    ).trim();

    if (!configuredSecret) {
      return reply.status(503).send({
        error: "ADMIN_SECRET_NOT_CONFIGURED",
        message: "Admin maxfiy kaliti sozlanmagan.",
      });
    }

    if (providedSecret !== configuredSecret) {
      return reply.status(401).send({
        error: "ADMIN_UNAUTHORIZED",
        message: "Admin maxfiy kaliti noto‘g‘ri.",
      });
    }
  });

  app.get("/api/admin/stats", async () => {
    return {
      stats: getAdminStats(),
    };
  });

  app.get("/api/admin/teams", async (request, reply) => {
    try {
      return {
        teams: listAdminTeams(request.query),
      };
    } catch (error) {
      return sendServiceError(reply, error);
    }
  });

  app.get(
    "/api/admin/teams/:teamId",
    async (request, reply) => {
      try {
        return {
          team: getAdminTeamDetails(
            request.params.teamId,
          ),
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/admin/teams/:teamId/approve",
    async (request, reply) => {
      try {
        const team = approveTeam(
          request.params.teamId,
          request.body,
        );

        await notifyCaptainReviewDecision({
          team,
          decision: "APPROVED",
        }).catch((error) => {
          request.log.error(error);
        });

        return {
          message: "Jamoa tasdiqlandi.",
          team,
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/admin/teams/:teamId/reject",
    async (request, reply) => {
      try {
        const team = rejectTeam(
          request.params.teamId,
          request.body,
        );

        await notifyCaptainReviewDecision({
          team,
          decision: "REJECTED",
          reason: request.body?.reason,
        }).catch((error) => {
          request.log.error(error);
        });

        return {
          message: "Jamoa rad etildi.",
          team,
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/admin/teams/:teamId/league",
    async (request, reply) => {
      try {
        const team = assignTeamLeague(
          request.params.teamId,
          request.body || {},
        );

        return {
          message:
            "Jamoa liga darajasiga biriktirildi.",
          team,
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );}