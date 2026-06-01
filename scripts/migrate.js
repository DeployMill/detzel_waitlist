import path from "node:path";
import * as npm from "node-pg-migrate";

const runner = npm.default ?? npm.runner ?? npm;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — provision the database first.");
}

await runner({
  databaseUrl: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
  dir: path.resolve(process.cwd(), "migrations"),
  direction: "up",
  count: Infinity,
  migrationsTable: "pgmigrations",
  noLock: true, // pooled endpoint = pgbouncer txn mode; no session advisory locks
  log: (msg) => console.log(msg),
});

console.log("migrations complete");
process.exit(0);
