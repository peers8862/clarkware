import type { FastifyInstance } from 'fastify';
import { query } from '@clark/db';
import { can } from '@clark/identity';
import { PermissionCategory } from '@clark/core';
import { forbidden } from '../../errors.js';

export default async function workstationsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/workstations', async (request) => {
    if (!can(request.actor, PermissionCategory.View, { level: 'facility', facilityId: '*' })) {
      throw forbidden();
    }
    return query<{ id: string; name: string; facility_id: string; zone_id: string; station_type: string; status: string }>(
      `SELECT id, name, facility_id, zone_id, station_type, status
       FROM workstations
       WHERE status != 'decommissioned'
       ORDER BY name`,
    );
  });
}
