import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  DatabaseSync,
} from "node:sqlite";

const root =
  process.cwd();

const databasePath =
  path.join(
    root,
    "packages",
    "database",
    "data",
    "liga-arena.db",
  );

const migrationDirectory =
  path.join(
    root,
    "apps",
    "worker",
    "migrations",
  );

const migrationPath =
  path.join(
    migrationDirectory,
    "0001_initial_schema.sql",
  );

const reportDirectory =
  path.join(
    root,
    "reports",
  );

const reportPath =
  path.join(
    reportDirectory,
    "d1-initial-schema-report.txt",
  );

if (!fs.existsSync(databasePath)) {
  throw new Error(
    `SQLite database topilmadi: ${databasePath}`,
  );
}

fs.mkdirSync(
  migrationDirectory,
  {
    recursive: true,
  },
);

fs.mkdirSync(
  reportDirectory,
  {
    recursive: true,
  },
);

const db =
  new DatabaseSync(
    databasePath,
    {
      readOnly: true,
    },
  );

const integrity =
  db.prepare(
    "PRAGMA integrity_check",
  ).all();

if (
  integrity.length !== 1 ||
  integrity[0].integrity_check !== "ok"
) {
  throw new Error(
    `SQLite integrity_check o'tmadi: ${JSON.stringify(integrity)}`,
  );
}

const tables =
  db.prepare(`
    SELECT
      name,
      sql
    FROM sqlite_schema
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    ORDER BY rowid
  `).all();

const indexes =
  db.prepare(`
    SELECT
      name,
      tbl_name,
      sql
    FROM sqlite_schema
    WHERE type = 'index'
      AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    ORDER BY rowid
  `).all();

const unsupportedObjects =
  db.prepare(`
    SELECT
      type,
      name,
      tbl_name,
      sql
    FROM sqlite_schema
    WHERE type IN (
      'trigger',
      'view'
    )
    ORDER BY type, name
  `).all();

const tableNames =
  new Set(
    tables.map(
      (table) =>
        table.name,
    ),
  );

const requiredTables = [
  "teams",
  "team_members",
  "member_invites",
  "competition_settings",
  "competition_rounds",
  "competition_round_teams",
  "league_standings",
  "system_settings",
];

const missingRequiredTables =
  requiredTables.filter(
    (name) =>
      !tableNames.has(name),
  );

if (
  missingRequiredTables.length > 0
) {
  throw new Error(
    `Majburiy jadvallar topilmadi: ${missingRequiredTables.join(", ")}`,
  );
}

function normalizeSql(
  sql,
) {
  return String(sql || "")
    .trim()
    .replace(
      /^CREATE TABLE\s+/i,
      "CREATE TABLE IF NOT EXISTS ",
    )
    .replace(
      /^CREATE UNIQUE INDEX\s+/i,
      "CREATE UNIQUE INDEX IF NOT EXISTS ",
    )
    .replace(
      /^CREATE INDEX\s+/i,
      "CREATE INDEX IF NOT EXISTS ",
    )
    .replace(
      /;\s*$/,
      "",
    );
}

const statements = [
  "-- Liga Arena D1 initial schema",
  "-- Generated from local SQLite schema.",
  "-- Faqat schema ko'chiriladi; lokal jamoa va test ma'lumotlari ko'chirilmaydi.",
  "",
  "PRAGMA defer_foreign_keys = true;",
  "",
];

for (const table of tables) {
  statements.push(
    `${normalizeSql(table.sql)};`,
    "",
  );
}

for (const index of indexes) {
  statements.push(
    `${normalizeSql(index.sql)};`,
    "",
  );
}

statements.push(
  `INSERT OR IGNORE INTO system_settings (
  key,
  value,
  updated_at
)
VALUES (
  'active_season',
  'S01',
  CURRENT_TIMESTAMP
);`,
  "",
);

fs.writeFileSync(
  migrationPath,
  `${statements.join("\n")}\n`,
  "utf8",
);

const reportLines = [
  "LIGA ARENA — D1 INITIAL SCHEMA REPORT",
  `Generated: ${new Date().toISOString()}`,
  `Source DB: ${databasePath}`,
  `Migration: ${migrationPath}`,
  "",
  `Integrity check: ${integrity[0].integrity_check}`,
  `Tables: ${tables.length}`,
  `Indexes: ${indexes.length}`,
  `Triggers / Views: ${unsupportedObjects.length}`,
  "",
  "TABLES",
  "============================================================",
  ...tables.map(
    (table, index) =>
      `${String(index + 1).padStart(2, "0")}. ${table.name}`,
  ),
  "",
  "INDEXES",
  "============================================================",
  ...indexes.map(
    (index, position) =>
      `${String(position + 1).padStart(2, "0")}. ${index.name} -> ${index.tbl_name}`,
  ),
  "",
  "TRIGGERS / VIEWS",
  "============================================================",
];

if (unsupportedObjects.length === 0) {
  reportLines.push(
    "TOPILMADI",
  );
} else {
  for (
    const object of
    unsupportedObjects
  ) {
    reportLines.push(
      `${object.type}: ${object.name} -> ${object.tbl_name}`,
    );
  }
}

reportLines.push(
  "",
  "MIGRATION PREVIEW",
  "============================================================",
  ...statements,
);

fs.writeFileSync(
  reportPath,
  `${reportLines.join("\n")}\n`,
  "utf8",
);

db.close();

console.log("");
console.log(
  "D1 INITIAL MIGRATION YARATILDI ✅",
);
console.log("");
console.log(
  `Tables: ${tables.length}`,
);
console.log(
  `Indexes: ${indexes.length}`,
);
console.log(
  `Triggers / Views: ${unsupportedObjects.length}`,
);
console.log("");
console.log(
  `Migration: ${migrationPath}`,
);
console.log(
  `Report: ${reportPath}`,
);