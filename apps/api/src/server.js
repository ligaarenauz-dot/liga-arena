import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { getDatabaseInfo } from "@liga-arena/database";
import teamRoutes from "./modules/teams/team.routes.js";
import uploadRoutes from "./modules/uploads/upload.routes.js";
import inviteRoutes from "./modules/invites/invite.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import scheduleRoutes from "./modules/schedule/schedule.routes.js";
import standingsRoutes from "./modules/standings/standings.routes.js";
import competitionRoutes from "./modules/competition/competition.routes.js";
import seasonRoutes from "./modules/seasons/season.routes.js";
import mlbbRoutes from "./modules/mlbb/mlbb.routes.js";
import archiveRoutes from "./modules/archive/archive.routes.js";
import eligibilityRoutes from "./modules/eligibility/eligibility.routes.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = Fastify({
  logger: true,
});

const PORT = Number(process.env.PORT || 4100);
const HOST = process.env.HOST || "0.0.0.0";

await app.register(cors, {
  origin: true,
  credentials: true,
  methods: [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Admin-Secret",
  ],
});

await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
});

await app.register(fastifyStatic, {
  root: path.resolve(currentDirectory, "../uploads"),
  prefix: "/uploads/",
});

await app.register(uploadRoutes);
await app.register(teamRoutes);
await app.register(inviteRoutes);
await app.register(adminRoutes);
await app.register(scheduleRoutes);
await app.register(standingsRoutes);
await app.register(competitionRoutes);
await app.register(seasonRoutes);
await app.register(mlbbRoutes);
await app.register(archiveRoutes);
await app.register(eligibilityRoutes);

app.get("/", async () => {
  return {
    app: "Liga Arena API",
    message: "Liga Arena serveri ishlamoqda.",
    health: "/api/health",
    teams: "/api/teams",
  };
});

app.get("/api/health", async () => {
  const database = getDatabaseInfo();

  return {
    healthy: true,
    app: "Liga Arena API",
    version: "0.3.0",
    database: database.connected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  };
});

app.setNotFoundHandler(async (request, reply) => {
  return reply.status(404).send({
    error: "NOT_FOUND",
    message: "Bunday API manzili topilmadi.",
    path: request.url,
  });
});

app.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  return reply.status(error.statusCode || 500).send({
    error: "SERVER_ERROR",
    message:
      process.env.NODE_ENV === "production"
        ? "Serverda kutilmagan xatolik yuz berdi."
        : error.message,
  });
});

const start = async () => {
  try {
    await app.listen({
      port: PORT,
      host: HOST,
    });

    console.log("");
    console.log(`Liga Arena API: http://127.0.0.1:${PORT}`);
    console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
    console.log(`Teams API: http://127.0.0.1:${PORT}/api/teams`);
    console.log("");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  console.log(`\n${signal} qabul qilindi. Server yopilmoqda...`);
  await app.close();
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

start();