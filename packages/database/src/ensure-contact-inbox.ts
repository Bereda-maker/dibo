import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const client = postgres(url, { max: 1 });
try {
  const migrationPath = resolve(import.meta.dir, "../migrations/0003_omniscient_marvel_zombies.sql");
  const migration = await readFile(migrationPath, "utf8");
  const statements = migration
    .split(/-->\s*statement-breakpoint/g)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.unsafe(statement);
  }

  console.log("Contact inbox schema ensured");
} finally {
  await client.end();
}
