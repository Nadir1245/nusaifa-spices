import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      })
    : new Pool({
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'nusaifa_spices',
        user: process.env.PGUSER || 'nusaifa_user',
        password: process.env.PGPASSWORD || '',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      });

  try {
    const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sqlContent = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
      console.log(`Applying migration: ${file}...`);
      await pool.query(sqlContent);
      console.log(`Migration ${file} applied successfully.`);
    }
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
