import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your environment to connect to Supabase."
  );
}

const poolConfig: PoolConfig = {
  connectionString,
};

// Supabase requires SSL for direct connections; disable certificate enforcement for simplicity.
if (!poolConfig.ssl && connectionString.includes("supabase.co")) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });
export type Database = typeof db;

