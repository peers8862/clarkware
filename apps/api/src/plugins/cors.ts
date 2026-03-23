import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';

export default fp(async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: process.env['NODE_ENV'] === 'production' ? false : true,
  });
});
