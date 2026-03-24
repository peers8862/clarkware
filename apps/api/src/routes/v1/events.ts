import type { FastifyInstance } from 'fastify';
import { EventStore } from '@clark/events';
import { can } from '@clark/identity';
import { PermissionCategory } from '@clark/core';
import { forbidden } from '../../errors.js';

const eventStore = new EventStore();

export default async function eventsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Querystring: { stream?: string; since?: string; limit?: string };
  }>(
    '/events',
    async (request) => {
      if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: '*' })) {
        throw forbidden();
      }

      const { stream, since, limit } = request.query;
      const limitNum = limit ? Math.min(parseInt(limit, 10), 1000) : 100;

      if (stream) {
        return eventStore.readStream(stream);
      }

      // since param treated as global_seq watermark if numeric, else ignored
      const fromSeq = since ? parseInt(since, 10) : 0;
      return eventStore.readAll(isNaN(fromSeq) ? 0 : fromSeq, limitNum);
    },
  );
}
