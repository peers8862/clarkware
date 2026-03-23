import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';

export default fp(async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyWebsocket);
});
