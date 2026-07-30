import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  getEligibilityRules,
  getTeamEligibility,
  saveMemberEligibility,
} from "./eligibility.service.js";

function sendServiceError(reply, error) {
  if (error instanceof TeamServiceError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  throw error;
}

export default async function eligibilityRoutes(app) {
  app.get(
    "/api/eligibility/rules",
    async () => {
      return {
        rules: getEligibilityRules(),
      };
    },
  );

  app.get(
    "/api/teams/:teamId/eligibility",
    async (request, reply) => {
      try {
        return {
          eligibility: getTeamEligibility(
            request.params.teamId,
          ),
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );

  app.put(
    "/api/teams/:teamId/members/:memberId/eligibility",
    async (request, reply) => {
      try {
        return {
          message:
            "O‘yinchining yosh ma’lumoti saqlandi.",

          eligibility: saveMemberEligibility(
            request.params.teamId,
            request.params.memberId,
            request.body,
          ),
        };
      } catch (error) {
        return sendServiceError(reply, error);
      }
    },
  );
}