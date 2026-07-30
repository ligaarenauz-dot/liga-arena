import {
  TeamServiceError,
  addTeamMember,
  checkGameId,
  createTeam,
  devConfirmAllTeamMembers,
  getTeamById,
  listTeams,
  removeTeamMember,
  submitTeam,
} from "./team.service.js";

import {
  notifyAdminsTeamSubmitted,
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

export default async function teamRoutes(app) {
  app.get("/api/teams", async (request) => {
    return {
      teams: listTeams(request.query),
    };
  });

  app.get("/api/teams/check-id", async (request, reply) => {
    try {
      return checkGameId(request.query);
    } catch (error) {
      return sendServiceError(reply, error);
    }
  });

  app.get("/api/teams/:teamId", async (request, reply) => {
    try {
      return getTeamById(request.params.teamId);
    } catch (error) {
      return sendServiceError(reply, error);
    }
  });

  app.post("/api/teams", async (request, reply) => {
    try {
      const team = createTeam(request.body);

      return reply.status(201).send({
        message: "Jamoa yaratildi.",
        team,
      });
    } catch (error) {
      return sendServiceError(reply, error);
    }
  });

  app.post(
    "/api/teams/:teamId/members",
    async (request, reply) => {
      try {
        const team = addTeamMember(
          request.params.teamId,
          request.body,
        );

        return reply.status(201).send({
          message: "O‘yinchi jamoaga qo‘shildi.",
          team,
        });
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.delete(
    "/api/teams/:teamId/members/:memberId",
    async (request, reply) => {
      try {
        const team = removeTeamMember(
          request.params.teamId,
          request.params.memberId,
        );

        return {
          message: "O‘yinchi tarkibdan olib tashlandi.",
          team,
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/teams/:teamId/dev-confirm-all",
    async (request, reply) => {
      try {
        const result = devConfirmAllTeamMembers(
          request.params.teamId,
        );

        return {
          message: `${result.confirmedCount} ta o‘yinchi test rejimida tasdiqlandi.`,
          ...result,
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/teams/:teamId/submit",
    async (request, reply) => {
      try {
        const team = submitTeam(request.params.teamId);

        await notifyAdminsTeamSubmitted(team).catch(
          (notificationError) => {
            request.log.error(notificationError);
          },
        );

        return {
          message: "Jamoa admin tekshiruviga yuborildi.",
          team,
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );
}