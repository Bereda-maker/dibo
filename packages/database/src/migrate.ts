import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolve } from "node:path";
const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL is required");
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: resolve(import.meta.dir, "../migrations") });
await client.end(); console.log("Migrations applied");
