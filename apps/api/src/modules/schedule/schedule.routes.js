import {
  TeamServiceError,
} from "../teams/team.service.js";

import {
  createScheduleEvent,
  deleteScheduleEvent,
  getScheduleEvent,
  listScheduleEvents,
  updateScheduleEvent,
} from "./schedule.service.js";

function sendServiceError(reply, error) {
  if (error instanceof TeamServiceError) {
    return reply.status(
      error.statusCode,
    ).send({
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
    request.headers["x-admin-secret"] || "",
  ).trim();

  if (!configuredSecret) {
    return reply.status(503).send({
      error: "ADMIN_SECRET_NOT_CONFIGURED",
      message:
        "Admin maxfiy kaliti sozlanmagan.",
    });
  }

  if (providedSecret !== configuredSecret) {
    return reply.status(401).send({
      error: "ADMIN_UNAUTHORIZED",
      message:
        "Admin maxfiy kaliti noto‘g‘ri.",
    });
  }
}

export default async function scheduleRoutes(app) {
  app.get(
    "/api/schedule",
    async (request, reply) => {
      try {
        return {
          events:
            listScheduleEvents(
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
    "/api/schedule/:eventId",
    async (request, reply) => {
      try {
        return {
          event:
            getScheduleEvent(
              request.params.eventId,
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
    "/api/admin/schedule",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        return {
          events:
            listScheduleEvents(
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

  app.post(
    "/api/admin/schedule",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        const event =
          createScheduleEvent(
            request.body || {},
          );

        return reply.status(201).send({
          message:
            "Jadval tadbiri yaratildi.",
          event,
        });
      } catch (error) {
        return sendServiceError(
          reply,
          error,
        );
      }
    },
  );

  app.put(
    "/api/admin/schedule/:eventId",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        const event =
          updateScheduleEvent(
            request.params.eventId,
            request.body || {},
          );

        return {
          message:
            "Jadval tadbiri yangilandi.",
          event,
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
    "/api/admin/schedule/:eventId",
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      try {
        return {
          message:
            "Jadval tadbiri o‘chirildi.",

          result:
            deleteScheduleEvent(
              request.params.eventId,
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