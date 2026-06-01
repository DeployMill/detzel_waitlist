import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add `database: { provider: "neon" }` to .deploymill/project.json and run reconcile_project.'
  );
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // The pooled endpoint requires TLS. The URI already specifies sslmode=require,
  // but pg's Node driver needs this hint to honor it.
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export async function query(text, params) {
  return pool.query(text, params);
}
