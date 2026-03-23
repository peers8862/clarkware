import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '@clark/db';
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  findRefreshToken,
  verifyRefreshToken,
} from '@clark/identity';
import { ActorType } from '@clark/core';
import type { PersonId } from '@clark/core';
import { unauthorized } from '../../errors.js';

interface LoginBody {
  username: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const { username, password } = request.body;

      // Join persons + actors tables — persons.id = actors.id (unified actor)
      const person = await queryOne<{
        id: string;
        password_hash: string;
        display_name: string;
        primary_facility_id: string | null;
      }>(
        `SELECT p.id, p.password_hash, p.display_name, p.primary_facility_id
         FROM persons p
         JOIN actors a ON a.id = p.id
         WHERE p.username = $1
           AND p.deleted_at IS NULL
           AND a.is_active = TRUE`,
        [username],
      );

      if (!person) throw unauthorized('Invalid credentials');

      const valid = await verifyPassword(person.password_hash, password);
      if (!valid) throw unauthorized('Invalid credentials');

      // Load effective roles from permission_grants (facility-scoped for primary facility)
      const grantRows = await query<{ role: string }>(
        `SELECT DISTINCT role
         FROM permission_grants
         WHERE actor_id = $1
           AND (expires_at IS NULL OR expires_at > now())
           AND revoked_at IS NULL`,
        [person.id],
      );
      const roles = grantRows.map((r) => r.role);

      const tokenPayload = {
        sub: person.id,
        actorType: ActorType.HumanUser,
        roles,
        facilityId: person.primary_facility_id ?? undefined,
      };

      const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(tokenPayload),
        signRefreshToken(tokenPayload),
      ]);

      await createRefreshTokenRecord(person.id as PersonId);

      await queryOne(
        'UPDATE persons SET last_login_at = now() WHERE id = $1',
        [person.id],
      );

      return {
        accessToken,
        refreshToken,
        actorId: person.id,
        displayName: person.display_name,
      };
    },
  );

  fastify.post<{ Body: RefreshBody }>(
    '/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    async (request) => {
      const { refreshToken } = request.body;

      const record = await findRefreshToken(refreshToken);
      if (!record) throw unauthorized('Invalid or expired refresh token');

      let payload;
      try {
        payload = await verifyRefreshToken(refreshToken);
      } catch {
        throw unauthorized('Invalid refresh token');
      }

      const newAccessToken = await signAccessToken({
        sub: payload.sub,
        actorType: payload.actorType,
        roles: payload.roles,
        facilityId: payload.facilityId,
      });
      return { accessToken: newAccessToken };
    },
  );

  fastify.post<{ Body: RefreshBody }>(
    '/auth/logout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(204).send();
    },
  );
}
