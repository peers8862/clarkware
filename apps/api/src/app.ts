import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifyHelmet from '@fastify/helmet';
import dbPlugin from './plugins/db.js';
import corsPlugin from './plugins/cors.js';
import websocketPlugin from './plugins/websocket.js';
import { errorHandler } from './errors.js';
import { configSchema } from './config.js';

export async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const fastify = Fastify({ logger: true });

  // 1. Environment validation (must be first)
  await fastify.register(fastifyEnv, {
    schema: configSchema,
    dotenv: true,
  });

  // 2. Cross-cutting infrastructure
  await fastify.register(corsPlugin);
  await fastify.register(fastifyHelmet);
  await fastify.register(dbPlugin);
  await fastify.register(websocketPlugin);

  // 3. Global error handler
  fastify.setErrorHandler(errorHandler);

  // 4. Health route (no auth)
  const healthRoutes = await import('./routes/health.js');
  await fastify.register(healthRoutes.default);

  // 5. Public auth routes (no auth middleware)
  const authRoutes = await import('./routes/v1/auth.js');
  await fastify.register(authRoutes.default, { prefix: '/v1' });

  // 6. Protected routes — apply auth plugin only to this scope
  const authPlugin = await import('./plugins/auth.js');
  await fastify.register(
    async (protected_) => {
      await protected_.register(authPlugin.default);

      const facilitiesRoutes = await import('./routes/v1/facilities.js');
      const jobsRoutes       = await import('./routes/v1/jobs.js');
      const notesRoutes      = await import('./routes/v1/notes.js');
      const eventsRoutes     = await import('./routes/v1/events.js');

      await protected_.register(facilitiesRoutes.default);
      await protected_.register(jobsRoutes.default);
      await protected_.register(notesRoutes.default);
      await protected_.register(eventsRoutes.default);
    },
    { prefix: '/v1' },
  );

  // 7. WebSocket real-time channel
  const realtimeRoutes = await import('./routes/ws/realtime.js');
  await fastify.register(realtimeRoutes.default);

  return fastify;
}
