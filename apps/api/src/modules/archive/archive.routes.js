import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  getArchivedStandings,
  listArchivedSeasons,
} from "./archive.service.js";

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

export default async function archiveRoutes(
  app,
) {
  app.get(
    "/api/archive/seasons",

    async (request, reply) => {
      try {
        return {
          seasons:
            listArchivedSeasons(
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
    "/api/archive/standings",

    async (request, reply) => {
      try {
        return getArchivedStandings(
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
}