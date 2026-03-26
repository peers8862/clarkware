import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { getPool } from '@clark/db';
import { CFXClient, CfxOutboxFlusher } from '@clark/cfx';

/**
 * CFX plugin — connects to the AMQP broker and starts the cfx_outbox flusher.
 *
 * Route handlers do NOT call fastify.cfx.publish() directly.
 * Instead they write to cfx_outbox via writeToOutbox() inside a domain transaction.
 * This flusher delivers those rows to RabbitMQ asynchronously.
 */
export default fp(async function cfxPlugin(fastify: FastifyInstance) {
  const amqpUrl = process.env.AMQP_URL ?? 'amqp://clark:clark_dev@localhost:5672';
  const cfxHandle = process.env.CLARK_CFX_HANDLE ?? 'clark.ipe.dev';

  const client = new CFXClient({ amqpUrl, cfxHandle });
  const flusher = new CfxOutboxFlusher(getPool(), client);

  client.connect().catch((err) => {
    fastify.log.warn({ err }, '[CFX] Initial broker connection failed — retrying in background');
  });

  flusher.start();

  fastify.addHook('onClose', async () => {
    flusher.stop();
    await client.close();
  });
});
