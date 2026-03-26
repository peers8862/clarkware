import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';

/**
 * Writes a CFX message to the cfx_outbox table.
 * Call this inside the same database transaction as your domain event append —
 * that guarantees the CFX message is durably queued if and only if the domain
 * state change committed.
 *
 * A background flusher (CfxOutboxFlusher) reads pending rows and delivers
 * them to the AMQP broker asynchronously.
 */
export async function writeToOutbox(
  client: PoolClient,
  cfxHandle: string,
  messageName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const envelope = {
    MessageName: messageName,
    Version: '2.0',
    TimeStamp: new Date().toISOString(),
    UniqueIdentifier: randomUUID(),
    Source: cfxHandle,
    ...payload,
  };

  await client.query(
    `INSERT INTO cfx_outbox (message_name, routing_key, payload)
     VALUES ($1, $2, $3)`,
    [messageName, messageName, JSON.stringify(envelope)],
  );
}
