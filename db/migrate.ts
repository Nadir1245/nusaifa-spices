import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const CORE_TABLES = [
  'users',
  'categories',
  'products',
  'delivery_settings',
  'orders',
  'order_items',
  'order_notifications',
  'promotional_banners',
  'site_content',
  'contact_messages',
];

function checksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  const pool = connectionString
    ? new Pool({
        connectionString,
        connectionTimeoutMillis: 15000,
        ssl: process.env.PGSSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      })
    : new Pool({
        connectionTimeoutMillis: 15000,
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'nusaifa_spices',
        user: process.env.PGUSER || 'nusaifa_user',
        password: process.env.PGPASSWORD || '',
        ssl: process.env.PGSSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      });

  console.log('Connecting to PostgreSQL database...');
  const client = await pool.connect();
  console.log('PostgreSQL connection established.');
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1)', [741852963]);
    lockAcquired = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.resolve(process.cwd(), 'db/migrations');
    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // Existing live database: mark the original schema as baseline.
    const existingTables = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
         AND table_name = ANY($1::text[])`,
      [CORE_TABLES],
    );

    const hasExistingSchema =
      existingTables.rows.length === CORE_TABLES.length;

    if (hasExistingSchema && files.includes('001_initial_schema.sql')) {
      const baselineContent = await fs.readFile(
        path.join(migrationsDir, '001_initial_schema.sql'),
        'utf-8',
      );

      await client.query(
        `INSERT INTO schema_migrations (filename, checksum)
         VALUES ($1, $2)
         ON CONFLICT (filename) DO NOTHING`,
        ['001_initial_schema.sql', checksum(baselineContent)],
      );

      console.log('Existing database detected. Initial schema marked as baseline.');
    }

    for (const file of files) {
      const sqlContent = await fs.readFile(
        path.join(migrationsDir, file),
        'utf-8',
      );
      const currentChecksum = checksum(sqlContent);

      const applied = await client.query(
        'SELECT checksum FROM schema_migrations WHERE filename = $1',
        [file],
      );

      if (applied.rows.length > 0) {
        if (applied.rows[0].checksum.trim() !== currentChecksum) {
          throw new Error(
            `Applied migration was modified: ${file}. Create a new migration instead.`,
          );
        }

        console.log(`Already applied: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}`);

      // Strip transaction markers from the original initial schema.
      const migrationSql = file === '001_initial_schema.sql'
        ? sqlContent
            .replace(/^[ \t]*BEGIN[ \t]*;[ \t]*$/im, '')
            .replace(/^[ \t]*COMMIT[ \t]*;[ \t]*$/im, '')
        : sqlContent;

      if (/^[ \t]*(BEGIN|COMMIT|ROLLBACK)\b/im.test(migrationSql)) {
        throw new Error(
          `${file} contains transaction commands. Let the migration runner manage transactions.`,
        );
      }

      await client.query('BEGIN');

      try {
        await client.query(migrationSql);

        await client.query(
          `INSERT INTO schema_migrations (filename, checksum)
           VALUES ($1, $2)`,
          [file, currentChecksum],
        );

        await client.query('COMMIT');
        console.log(`Migration applied successfully: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All database migrations are up to date.');
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [741852963])
        .catch(() => {});
    }

    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
