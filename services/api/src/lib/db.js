import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
