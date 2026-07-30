import dotenv from "dotenv";
import {
  dirname,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@liga-arena/database";
import { getTeamById } from "../modules/teams/team.service.js";
import { notifyAdminsTeamSubmitted } from "../services/telegram-notifier.js";

const currentDirectory = dirname(
  fileURLToPath(import.meta.url),
);

dotenv.config({
  path: resolve(currentDirectory, "../../.env"),
  override: true,
});

const latestTeamRow = db
  .prepare(`
    SELECT id
    FROM teams
    WHERE
      logo_url IS NOT NULL
      AND TRIM(logo_url) <> ''
    ORDER BY
      CASE
        WHEN status = 'PENDING_REVIEW' THEN 0
        ELSE 1
      END,
      updated_at DESC
    LIMIT 1
  `)
  .get();

if (!latestTeamRow) {
  console.error(
    "Logo biriktirilgan test jamoasi topilmadi.",
  );

  process.exitCode = 1;
} else {
  const team = getTeamById(latestTeamRow.id);

  console.log(
    `Xabar qayta yuborilmoqda: ${team.name}`,
  );

  try {
    const result =
      await notifyAdminsTeamSubmitted(team);

    console.log(
      JSON.stringify(result, null, 2),
    );

    const failedResult =
      result.results?.find(
        (item) =>
          !item.sent ||
          item.photoError ||
          item.messageType !== "photo",
      );

    if (failedResult) {
      console.error("");
      console.error(
        "Logo hali yuborilmadi:",
        failedResult.photoError ||
          failedResult.error ||
          "Noma'lum xato",
      );

      process.exitCode = 1;
    } else {
      console.log("");
      console.log(
        "Logo Telegram adminiga muvaffaqiyatli yuborildi.",
      );
    }
  } catch (error) {
    console.error(
      "Xabar yuborishda xato:",
      error.message,
    );

    process.exitCode = 1;
  }
}