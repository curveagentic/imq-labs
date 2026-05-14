import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 8000,
  query_timeout: 10000,
  statement_timeout: 10000,
  ssl: process.env.DATABASE_URL?.includes('pooler.supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
