import type { FastifyInstance } from 'fastify';
import { v7 as uuidv7 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { can } from '@clark/identity';
import { PermissionCategory } from '@clark/core';
import { notFound, forbidden } from '../../errors.js';

export default async function facilitiesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/facilities', async (request) => {
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: '*' })) {
      throw forbidden();
    }
    const rows = await query<{
      id: string; name: string; address: string | null;
      timezone: string; created_at: Date; updated_at: Date;
    }>(
      'SELECT id, name, address, timezone, created_at, updated_at FROM facilities WHERE deleted_at IS NULL ORDER BY name',
    );
    return rows;
  });

  fastify.get<{ Params: { id: string } }>('/facilities/:id', async (request) => {
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: request.params.id })) {
      throw forbidden();
    }
    const row = await queryOne<{ id: string; name: string; address: string | null; timezone: string; created_at: Date; updated_at: Date }>(
      'SELECT id, name, address, timezone, created_at, updated_at FROM facilities WHERE id = $1 AND deleted_at IS NULL',
      [request.params.id],
    );
    if (!row) throw notFound();
    return row;
  });

  fastify.post<{ Body: { name: string; address?: string; timezone?: string } }>(
    '/facilities',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name:     { type: 'string', minLength: 1 },
            address:  { type: 'string' },
            timezone: { type: 'string', default: 'UTC' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!can(request.actor, PermissionCategory.AdministerIntegrations, { level: 'facility', facilityId: '*' })) {
        throw forbidden();
      }
      const id = uuidv7();
      const { name, address = null, timezone = 'UTC' } = request.body;
      await query(
        'INSERT INTO facilities (id, name, address, timezone) VALUES ($1, $2, $3, $4)',
        [id, name, address, timezone],
      );
      return reply.status(201).send({ id, name, address, timezone });
    },
  );
}
