import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  confirmMemberInvite,
  createMemberInvite,
  getInvitePreview,
  rejectMemberInvite,
} from "./invite.service.js";

function sendServiceError(reply, error) {
  if (error instanceof TeamServiceError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  throw error;
}

export default async function inviteRoutes(app) {
  app.post(
    "/api/teams/:teamId/members/:memberId/invite",
    async (request, reply) => {
      try {
        const result = createMemberInvite(
          request.params.teamId,
          request.params.memberId,
          process.env.BOT_USERNAME,
        );

        return reply.status(201).send({
          message: "Tasdiqlash havolasi yaratildi.",
          ...result,
        });
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.get(
    "/api/invites/:token",
    async (request, reply) => {
      try {
        return {
          invite: getInvitePreview(
            request.params.token,
          ),
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/invites/:token/confirm",
    async (request, reply) => {
      try {
        return confirmMemberInvite(
          request.params.token,
          request.body,
        );
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.post(
    "/api/invites/:token/reject",
    async (request, reply) => {
      try {
        return rejectMemberInvite(
          request.params.token,
        );
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );
}