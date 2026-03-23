import type { FastifyInstance } from 'fastify';
import authRoutes from './auth.js';
import facilitiesRoutes from './facilities.js';
import jobsRoutes from './jobs.js';
import notesRoutes from './notes.js';
import eventsRoutes from './events.js';

export default async function v1Routes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(authRoutes);
  await fastify.register(facilitiesRoutes);
  await fastify.register(jobsRoutes);
  await fastify.register(notesRoutes);
  await fastify.register(eventsRoutes);
}
