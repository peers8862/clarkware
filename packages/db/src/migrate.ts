import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withTransaction } from './pool.js';
import type pg from 'pg';

/**
 * Minimal migration runner.
 * Reads .sql files from migrationsDir sorted lexicographically,
 * applies each one in a transaction, and records in _migrations table.
 */
export async function runMigrations(migrationsDir: string): Promise<void> {
  await withTransaction(async (client) => {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Read already-applied migrations
    const applied = await client.query<{ filename: string }>(
      'SELECT filename FROM _migrations ORDER BY id',
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    // Read migration files
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const sql = await readFile(join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`[migrate] Applied: ${file}`);
    }
  });
}

export type { pg };
