import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const uploadDirectory = path.resolve(
  currentDirectory,
  "../../../uploads/team-logos",
);

const allowedTypes = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export default async function uploadRoutes(app) {
  app.post("/api/uploads/team-logo", async (request, reply) => {
    const file = await request.file();

    if (!file) {
      return reply.status(400).send({
        error: "LOGO_REQUIRED",
        message: "Jamoa logotipini tanlang.",
      });
    }

    const extension = allowedTypes[file.mimetype];

    if (!extension) {
      return reply.status(400).send({
        error: "INVALID_LOGO_TYPE",
        message: "Logo PNG, JPG yoki WEBP formatida bo‘lishi kerak.",
      });
    }

    let buffer;

    try {
      buffer = await file.toBuffer();
    } catch {
      return reply.status(413).send({
        error: "LOGO_TOO_LARGE",
        message: "Logo hajmi 2 MB dan oshmasligi kerak.",
      });
    }

    if (buffer.length > 2 * 1024 * 1024) {
      return reply.status(413).send({
        error: "LOGO_TOO_LARGE",
        message: "Logo hajmi 2 MB dan oshmasligi kerak.",
      });
    }

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    const filename = `${randomUUID()}${extension}`;
    const targetPath = path.join(uploadDirectory, filename);

    await fs.writeFile(targetPath, buffer);

    return reply.status(201).send({
      message: "Logo yuklandi.",
      logoUrl: `/uploads/team-logos/${filename}`,
    });
  });
}