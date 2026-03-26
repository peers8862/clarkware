import type { Pool } from 'pg';
import { CFXClient } from './cfx-client.js';

interface OutboxRow {
  id: string;
  routing_key: string;
  payload: object;
}

/**
 * Reads pending rows from cfx_outbox and publishes them to the AMQP broker.
 * Run as a background service alongside the Fastify API or Theia backend.
 *
 * The flush loop:
 * 1. SELECT ... FOR UPDATE SKIP LOCKED — safe for concurrent instances
 * 2. Publish each row via CFXClient
 * 3. Mark as 'delivered' on success, increment attempts on failure
 * 4. After MAX_ATTEMPTS, mark as 'dead' for investigation
 */
export class CfxOutboxFlusher {
  private timer: NodeJS.Timeout | undefined;
  private readonly MAX_ATTEMPTS = 10;

  constructor(
    private readonly pool: Pool,
    private readonly client: CFXClient,
    private readonly intervalMs = 5_000,
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      this.flush().catch((err) => console.error('[CfxOutboxFlusher] flush error:', err));
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async flush(): Promise<void> {
    if (this.client.connectionStatus !== 'connected') return;

    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');

      const { rows } = await db.query<OutboxRow>(
        `SELECT id, routing_key, payload
         FROM cfx_outbox
         WHERE status = 'pending' AND attempts < $1
         ORDER BY created_at
         LIMIT 50
         FOR UPDATE SKIP LOCKED`,
        [this.MAX_ATTEMPTS],
      );

      for (const row of rows) {
        try {
          // CFXClient.publishRaw sends a pre-built envelope directly
          this.client.publishRaw(row.routing_key, row.payload);
          await db.query(
            `UPDATE cfx_outbox
             SET status = 'delivered', delivered_at = NOW()
             WHERE id = $1`,
            [row.id],
          );
        } catch {
          await db.query(
            `UPDATE cfx_outbox
             SET attempts = attempts + 1,
                 status = CASE WHEN attempts + 1 >= $2 THEN 'dead' ELSE 'pending' END
             WHERE id = $1`,
            [row.id, this.MAX_ATTEMPTS],
          );
        }
      }

      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      db.release();
    }
  }
}
