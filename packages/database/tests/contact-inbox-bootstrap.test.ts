import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migrationPath = resolve(import.meta.dir, "../migrations/0003_omniscient_marvel_zombies.sql");

test("contact inbox bootstrap creates the schema idempotently", async () => {
  const database = new PGlite();
  try {
    const migration = await readFile(migrationPath, "utf8");
    const statements = migration
      .split(/-->\s*statement-breakpoint/g)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (let run = 0; run < 2; run += 1) {
      for (const statement of statements) await database.exec(statement);
    }

    const columns = await database.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contact_messages' ORDER BY ordinal_position",
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      "id",
      "name",
      "email",
      "message",
      "status",
      "created_at",
      "updated_at",
    ]);

    const indexes = await database.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'contact_messages'",
    );
    expect(indexes.rows.map((row) => row.indexname)).toContain("contact_messages_created_idx");
    expect(indexes.rows.map((row) => row.indexname)).toContain("contact_messages_status_idx");
  } finally {
    await database.close();
  }
});
