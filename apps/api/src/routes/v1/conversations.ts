import type { FastifyInstance } from 'fastify';
import { v7 as uuidv7 } from 'uuid';
import { query, queryOne } from '@clark/db';
import { can } from '@clark/identity';
import { PermissionCategory, ConversationType } from '@clark/core';
import { forbidden, notFound, badRequest } from '../../errors.js';

export default async function conversationsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { facilityId?: string; jobId?: string; issueId?: string; type?: string } }>(
    '/conversations',
    async (request) => {
      const { facilityId, jobId, issueId, type } = request.query;

      if (facilityId && !can(request.actor, PermissionCategory.View, { level: 'facility', facilityId })) {
        throw forbidden();
      }

      let sql = `SELECT id, conversation_type, facility_id, zone_id, workstation_id, job_id, issue_id,
                        xmpp_room_jid, title, status, created_at
                 FROM conversations WHERE deleted_at IS NULL`;
      const params: unknown[] = [];

      if (facilityId) { params.push(facilityId); sql += ` AND facility_id = $${params.length}`; }
      if (jobId)      { params.push(jobId);      sql += ` AND job_id = $${params.length}`; }
      if (issueId)    { params.push(issueId);    sql += ` AND issue_id = $${params.length}`; }
      if (type)       { params.push(type);       sql += ` AND conversation_type = $${params.length}`; }

      sql += ' ORDER BY created_at DESC';
      return query(sql, params);
    },
  );

  fastify.get<{ Params: { id: string } }>('/conversations/:id', async (request) => {
    const row = await queryOne<{ id: string; facility_id: string; conversation_type: string }>(
      `SELECT id, conversation_type, facility_id, zone_id, workstation_id, job_id, issue_id,
              xmpp_room_jid, title, status, created_at, updated_at
       FROM conversations WHERE id = $1 AND deleted_at IS NULL`,
      [request.params.id],
    );
    if (!row) throw notFound();
    if (row.facility_id && !can(request.actor, PermissionCategory.View, { level: 'conversation', conversationId: row.id })) {
      throw forbidden();
    }
    return row;
  });

  fastify.get<{ Params: { id: string }; Querystring: { limit?: number; before?: string } }>(
    '/conversations/:id/messages',
    async (request) => {
      const { id } = request.params;
      const limit = Math.min(request.query.limit ?? 50, 200);
      const before = request.query.before;

      const convo = await queryOne<{ facility_id: string }>(
        'SELECT facility_id FROM conversations WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      if (!convo) throw notFound();

      let sql = `SELECT id, sender_actor_id, sender_type, body, message_class, review_state,
                        reply_to_message_id, superseded_by_message_id, sent_at, created_at
                 FROM messages
                 WHERE conversation_id = $1
                   AND superseded_by_message_id IS NULL`;
      const params: unknown[] = [id];

      if (before) {
        params.push(before);
        sql += ` AND sent_at < (SELECT sent_at FROM messages WHERE id = $${params.length})`;
      }

      sql += ` ORDER BY sent_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const rows = await query(sql, params);
      return rows.reverse();
    },
  );

  fastify.post<{
    Body: {
      conversationType: string;
      facilityId?: string;
      zoneId?: string;
      workstationId?: string;
      jobId?: string;
      issueId?: string;
      title?: string;
    };
  }>(
    '/conversations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['conversationType'],
          properties: {
            conversationType: { type: 'string', enum: Object.values(ConversationType) },
            facilityId:       { type: 'string' },
            zoneId:           { type: 'string' },
            workstationId:    { type: 'string' },
            jobId:            { type: 'string' },
            issueId:          { type: 'string' },
            title:            { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { conversationType, facilityId, zoneId, workstationId, jobId, issueId, title } = request.body;

      if (facilityId && !can(request.actor, PermissionCategory.InitiateConversation, { level: 'facility', facilityId })) {
        throw forbidden();
      }

      const id = uuidv7();

      await query(
        `INSERT INTO conversations (id, conversation_type, facility_id, zone_id, workstation_id, job_id, issue_id, title, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
        [id, conversationType, facilityId ?? null, zoneId ?? null, workstationId ?? null,
         jobId ?? null, issueId ?? null, title ?? null],
      );

      // Add creator as participant
      await query(
        `INSERT INTO conversation_participants (conversation_id, actor_id, role_in_convo)
         VALUES ($1, $2, 'owner')`,
        [id, request.actor.actorId],
      );

      return reply.status(201).send({ id });
    },
  );

  fastify.post<{ Params: { id: string }; Body: { actorId: string; role?: string } }>(
    '/conversations/:id/participants',
    {
      schema: {
        params:  { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['actorId'],
          properties: {
            actorId: { type: 'string' },
            role:    { type: 'string', enum: ['participant', 'observer', 'ai_assistant'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { actorId, role = 'participant' } = request.body;

      const convo = await queryOne<{ facility_id: string | null }>(
        'SELECT facility_id FROM conversations WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      if (!convo) throw notFound();

      const scope = convo.facility_id
        ? { level: 'facility' as const, facilityId: convo.facility_id }
        : { level: 'conversation' as const, conversationId: id };

      if (!can(request.actor, PermissionCategory.InitiateConversation, scope)) {
        throw forbidden();
      }

      await query(
        `INSERT INTO conversation_participants (conversation_id, actor_id, role_in_convo)
         VALUES ($1, $2, $3)
         ON CONFLICT (conversation_id, actor_id) DO UPDATE SET role_in_convo = $3, left_at = NULL`,
        [id, actorId, role],
      );

      return reply.status(204).send();
    },
  );

  fastify.post<{ Params: { id: string }; Body: { body: string; messageClass?: string; replyToMessageId?: string } }>(
    '/conversations/:id/messages',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['body'],
          properties: {
            body:               { type: 'string', minLength: 1 },
            messageClass:       { type: 'string' },
            replyToMessageId:   { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { body: msgBody, messageClass = 'chat', replyToMessageId } = request.body;

      const convo = await queryOne<{ facility_id: string | null }>(
        'SELECT facility_id FROM conversations WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      if (!convo) throw notFound();

      if (convo.facility_id && !can(request.actor, PermissionCategory.Comment, { level: 'conversation', conversationId: id })) {
        throw forbidden();
      }

      const msgId = uuidv7();
      const actorId = request.actor.actorId;

      await query(
        `INSERT INTO messages (id, conversation_id, sender_actor_id, sender_type, body,
                               message_class, review_state, reply_to_message_id, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'not_required', $7, now())`,
        [msgId, id, actorId, request.actor.type, msgBody, messageClass, replyToMessageId ?? null],
      );

      return reply.status(201).send({ id: msgId });
    },
  );

  // Archive a conversation
  fastify.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/conversations/:id',
    {
      schema: {
        params: { type: 'object', properties: { id: { type: 'string' } } },
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['archived', 'closed'] } },
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { status } = request.body;

      const convo = await queryOne<{ facility_id: string | null }>(
        'SELECT facility_id FROM conversations WHERE id = $1 AND deleted_at IS NULL',
        [id],
      );
      if (!convo) throw notFound();

      await query(
        'UPDATE conversations SET status = $1, updated_at = now() WHERE id = $2',
        [status, id],
      );

      return { ok: true };
    },
  );
}
