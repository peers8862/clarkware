import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { can } from '@clark/identity';
import { PermissionCategory } from '@clark/core';
import { forbidden, notFound, badRequest } from '../../errors.js';

export default async function permissionsRoutes(fastify: FastifyInstance): Promise<void> {
  // List grants for an actor
  fastify.get<{ Params: { actorId: string } }>(
    '/actors/:actorId/grants',
    async (request) => {
      const { actorId } = request.params;

      // Only admins or the actor themselves can view their grants
      const isSelf = request.actor.actorId === actorId;
      if (!isSelf && !can(request.actor, PermissionCategory.AdministerIntegrations, { level: 'facility', facilityId: '*' })) {
        throw forbidden();
      }

      return query(
        `SELECT id, actor_id, actor_type, role, scope_level,
                scope_facility_id, scope_zone_id, scope_workstation_id,
                scope_job_id, scope_issue_id, scope_conversation_id,
                permissions, allowed_action_classes,
                granted_at, granted_by, expires_at, granted_for_reason,
                revoked_at
         FROM permission_grants
         WHERE actor_id = $1 AND revoked_at IS NULL
         ORDER BY granted_at DESC`,
        [actorId],
      );
    },
  );

  // Create a permission grant
  fastify.post<{
    Body: {
      actorId: string;
      actorType: string;
      role: string;
      scopeLevel: string;
      scopeFacilityId?: string;
      scopeZoneId?: string;
      scopeWorkstationId?: string;
      scopeJobId?: string;
      scopeIssueId?: string;
      scopeConversationId?: string;
      permissions: string[];
      allowedActionClasses?: string[];
      expiresAt?: string;
      grantedForReason?: string;
    };
  }>(
    '/grants',
    {
      schema: {
        body: {
          type: 'object',
          required: ['actorId', 'actorType', 'role', 'scopeLevel', 'permissions'],
          properties: {
            actorId:            { type: 'string' },
            actorType:          { type: 'string' },
            role:               { type: 'string' },
            scopeLevel:         { type: 'string', enum: ['facility', 'zone', 'workstation', 'job', 'issue', 'conversation'] },
            scopeFacilityId:    { type: 'string' },
            scopeZoneId:        { type: 'string' },
            scopeWorkstationId: { type: 'string' },
            scopeJobId:         { type: 'string' },
            scopeIssueId:       { type: 'string' },
            scopeConversationId:{ type: 'string' },
            permissions:        { type: 'array', items: { type: 'string' } },
            allowedActionClasses: { type: 'array', items: { type: 'string' } },
            expiresAt:          { type: 'string', format: 'date-time' },
            grantedForReason:   { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const {
        actorId, actorType, role,
        scopeLevel, scopeFacilityId, scopeZoneId, scopeWorkstationId,
        scopeJobId, scopeIssueId, scopeConversationId,
        permissions, allowedActionClasses = [],
        expiresAt, grantedForReason,
      } = request.body;

      // Granter must have AdministerIntegrations at the target scope's facility
      const facilityId = scopeFacilityId ?? '*';
      if (!can(request.actor, PermissionCategory.AdministerIntegrations, { level: 'facility', facilityId })) {
        throw forbidden();
      }

      // Verify target actor exists
      const target = await queryOne<{ id: string }>(
        'SELECT id FROM actors WHERE id = $1',
        [actorId],
      );
      if (!target) throw badRequest('Target actor not found');

      const id = uuidv4();

      await query(
        `INSERT INTO permission_grants (
           id, actor_id, actor_type, role,
           scope_level, scope_facility_id, scope_zone_id, scope_workstation_id,
           scope_job_id, scope_issue_id, scope_conversation_id,
           permissions, allowed_action_classes,
           granted_at, granted_by, expires_at, granted_for_reason
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9, $10, $11,
           $12, $13,
           now(), $14, $15, $16
         )`,
        [
          id, actorId, actorType, role,
          scopeLevel, scopeFacilityId ?? null, scopeZoneId ?? null, scopeWorkstationId ?? null,
          scopeJobId ?? null, scopeIssueId ?? null, scopeConversationId ?? null,
          permissions, allowedActionClasses,
          request.actor.actorId,
          expiresAt ? new Date(expiresAt) : null,
          grantedForReason ?? null,
        ],
      );

      return reply.status(201).send({ id });
    },
  );

  // Revoke a grant
  fastify.delete<{ Params: { id: string } }>(
    '/grants/:id',
    async (request) => {
      const { id } = request.params;

      const grant = await queryOne<{ scope_facility_id: string | null }>(
        'SELECT scope_facility_id FROM permission_grants WHERE id = $1 AND revoked_at IS NULL',
        [id],
      );
      if (!grant) throw notFound();

      const facilityId = grant.scope_facility_id ?? '*';
      if (!can(request.actor, PermissionCategory.AdministerIntegrations, { level: 'facility', facilityId })) {
        throw forbidden();
      }

      await query(
        'UPDATE permission_grants SET revoked_at = now(), revoked_by = $1 WHERE id = $2',
        [request.actor.actorId, id],
      );

      return { ok: true };
    },
  );
}
