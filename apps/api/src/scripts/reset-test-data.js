import { db } from "@liga-arena/database";

const knownTables = [
  "member_eligibility",
  "member_invites",
  "team_reviews",
  "team_members",
  "teams",
];

const existingTables = new Set(
  db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
    `)
    .all()
    .map((row) => row.name),
);

db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN IMMEDIATE");

try {
  for (const tableName of knownTables) {
    if (!existingTables.has(tableName)) {
      console.log(
        `Jadval mavjud emas, o'tkazib yuborildi: ${tableName}`,
      );

      continue;
    }

    db.exec(`DELETE FROM ${tableName}`);

    console.log(
      `Tozalandi: ${tableName}`,
    );
  }

  db.exec("COMMIT");
  db.exec("VACUUM");

  console.log("");
  console.log(
    "Barcha test jamoalari muvaffaqiyatli o'chirildi.",
  );
} catch (error) {
  db.exec("ROLLBACK");

  console.error("");
  console.error(
    "Database tozalashda xato:",
    error.message,
  );

  process.exitCode = 1;
}