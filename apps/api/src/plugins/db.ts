import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { getPool } from '@clark/db';
import type { Pool } from 'pg';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
  }
}

export default fp(async function dbPlugin(fastify: FastifyInstance) {
  const pool = getPool();
  fastify.decorate('db', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});
