import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? process.env.DATABASE_PRIVATE_URL;

  if (direct) return direct;

  const host = process.env.PGHOST;
  const port = process.env.PGPORT ?? "5432";
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (host && user && password && database) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;
  }

  throw new Error(
    "Database URL is missing. Set one of: DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, DATABASE_PRIVATE_URL, or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.",
  );
}

const connectionString = resolveDatabaseUrl();

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
