import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/equiphub",
});

export async function query(text, params = []) {
  return pool.query(text, params);
}
