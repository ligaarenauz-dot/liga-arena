import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  DatabaseSync,
} from "node:sqlite";

const root =
  process.cwd();

const sourceDatabasePath =
  path.join(
    root,
    "packages",
    "database",
    "data",
    "liga-arena.db",
  );

const migrationPath =
  path.join(
    root,
    "apps",
    "worker",
    "migrations",
    "0002_technical_number_trigger.sql",
  );

const testPath =
  path.join(
    root,
    "scripts",
    "d1-technical-number-trigger-test.sql",
  );

if (
  !fs.existsSync(
    sourceDatabasePath,
  )
) {
  throw new Error(
    `Source database topilmadi: ${sourceDatabasePath}`,
  );
}

const db =
  new DatabaseSync(
    sourceDatabasePath,
    {
      readOnly: true,
    },
  );

const trigger =
  db.prepare(`
    SELECT
      name,
      tbl_name AS tableName,
      sql
    FROM sqlite_schema
    WHERE type = 'trigger'
      AND name = ?
  `).get(
    "trg_assign_team_technical_number",
  );

if (!trigger?.sql) {
  throw new Error(
    "trg_assign_team_technical_number trigger topilmadi.",
  );
}

const normalizedTriggerSql =
  String(trigger.sql)
    .trim()
    .replace(
      /^CREATE\s+TRIGGER\s+/i,
      "CREATE TRIGGER IF NOT EXISTS ",
    )
    .replace(
      /;\s*$/,
      "",
    );

const migrationSql = [
  "-- Liga Arena technical number trigger",
  "-- Source: local SQLite database",
  "-- Technical number assignment must remain automatic.",
  "",
  `${normalizedTriggerSql};`,
  "",
].join("\n");

fs.writeFileSync(
  migrationPath,
  migrationSql,
  "utf8",
);

const sampleTeam =
  db.prepare(`
    SELECT *
    FROM teams
    ORDER BY
      created_at,
      id
    LIMIT 1
  `).get();

if (!sampleTeam) {
  fs.writeFileSync(
    testPath,
    [
      "-- Source database ichida test uchun jamoa topilmadi.",
      "-- Trigger yaratish testi baribir migration orqali bajariladi.",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log("");
  console.log(
    "Trigger migration yaratildi.",
  );

  console.log(
    "Source bazada test jamoasi topilmadi.",
  );

  console.log(
    "Faqat CREATE TRIGGER sinovi bajariladi.",
  );

  db.close();
  process.exit(0);
}

const suffix =
  Date.now()
    .toString()
    .slice(-8);

const testTeamId =
  `d1-trigger-test-${suffix}`;

const testTeam = {
  ...sampleTeam,
};

testTeam.id =
  testTeamId;

if (
  Object.hasOwn(
    testTeam,
    "technical_number",
  )
) {
  testTeam.technical_number =
    "";
}

if (
  Object.hasOwn(
    testTeam,
    "name",
  )
) {
  testTeam.name =
    `D1 Trigger Test ${suffix}`;
}

if (
  Object.hasOwn(
    testTeam,
    "tag",
  )
) {
  testTeam.tag =
    `D1T${suffix.slice(-4)}`;
}

if (
  Object.hasOwn(
    testTeam,
    "captain_telegram_id",
  )
) {
  testTeam.captain_telegram_id =
    `999${suffix}`;
}

if (
  Object.hasOwn(
    testTeam,
    "created_at",
  )
) {
  testTeam.created_at =
    new Date().toISOString();
}

if (
  Object.hasOwn(
    testTeam,
    "updated_at",
  )
) {
  testTeam.updated_at =
    new Date().toISOString();
}

/*
 * UNIQUE indexlarga tushadigan boshqa qiymatlarni
 * ham test uchun noyob qilamiz.
 */
const uniqueIndexes =
  db.prepare(`
    PRAGMA index_list('teams')
  `).all().filter(
    (index) =>
      Number(index.unique) === 1,
  );

const protectedColumns =
  new Set([
    "game",
    "season",
    "status",
    "technical_number",
  ]);

for (
  const index of
  uniqueIndexes
) {
  const safeIndexName =
    String(index.name)
      .replace(
        /"/g,
        '""',
      );

  const indexColumns =
    db.prepare(
      `PRAGMA index_info("${safeIndexName}")`,
    ).all();

  for (
    const indexColumn of
    indexColumns
  ) {
    const columnName =
      indexColumn.name;

    if (
      !columnName ||
      protectedColumns.has(
        columnName,
      ) ||
      !Object.hasOwn(
        testTeam,
        columnName,
      )
    ) {
      continue;
    }

    if (columnName === "id") {
      testTeam[columnName] =
        testTeamId;

      continue;
    }

    if (columnName === "tag") {
      testTeam[columnName] =
        `D1T${suffix.slice(-4)}`;

      continue;
    }

    if (
      columnName.includes(
        "telegram_id",
      )
    ) {
      testTeam[columnName] =
        `999${suffix}`;

      continue;
    }

    const currentValue =
      testTeam[columnName];

    if (
      typeof currentValue ===
      "number"
    ) {
      testTeam[columnName] =
        currentValue +
        900000000;

      continue;
    }

    testTeam[columnName] =
      `${String(
        currentValue || columnName,
      ).slice(0, 30)}-${suffix}`;
  }
}

function quoteIdentifier(
  value,
) {
  return `"${String(value)
    .replace(
      /"/g,
      '""',
    )}"`;
}

function sqlLiteral(
  value,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "NULL";
  }

  if (
    typeof value ===
    "number"
  ) {
    if (
      !Number.isFinite(value)
    ) {
      throw new Error(
        "Finite bo'lmagan raqam topildi.",
      );
    }

    return String(value);
  }

  if (
    typeof value ===
    "bigint"
  ) {
    return value.toString();
  }

  return `'${String(value)
    .replace(
      /'/g,
      "''",
    )}'`;
}

const columns =
  Object.keys(
    testTeam,
  );

const testSql = [
  "-- Liga Arena D1 technical-number trigger test",
  "-- Faqat local D1 bazada bajarilsin.",
  "",
  `DELETE FROM teams WHERE id = ${sqlLiteral(testTeamId)};`,
  "",
  `INSERT INTO teams (`,
  `  ${columns
    .map(quoteIdentifier)
    .join(",\n  ")}`,
  `)`,
  `VALUES (`,
  `  ${columns
    .map(
      (column) =>
        sqlLiteral(
          testTeam[column],
        ),
    )
    .join(",\n  ")}`,
  `);`,
  "",
  `SELECT`,
  `  id,`,
  `  game,`,
  `  season,`,
  `  name,`,
  `  tag,`,
  `  technical_number`,
  `FROM teams`,
  `WHERE id = ${sqlLiteral(testTeamId)};`,
  "",
].join("\n");

fs.writeFileSync(
  testPath,
  testSql,
  "utf8",
);

db.close();

console.log("");
console.log(
  "D1 TECHNICAL NUMBER TRIGGER EXPORT TAYYOR ✅",
);

console.log("");
console.log(
  `Trigger: ${trigger.name}`,
);

console.log(
  `Table: ${trigger.tableName}`,
);

console.log(
  `Migration: ${migrationPath}`,
);

console.log(
  `Test SQL: ${testPath}`,
);