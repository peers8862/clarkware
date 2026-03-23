import type { FastifyInstance } from 'fastify';
import { queryOne } from '@clark/db';
import {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  createRefreshTokenRecord,
  findRefreshToken,
  verifyRefreshToken,
} from '@clark/identity';
import type { PersonId } from '@clark/core';
import { unauthorized, badRequest } from '../../errors.js';

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

      const person = await queryOne<{
        id: string;
        password_hash: string;
        roles: string;
        display_name: string;
      }>(
        `SELECT id, password_hash, roles, display_name
         FROM persons
         WHERE username = $1 AND deleted_at IS NULL`,
        [username],
      );

      if (!person) throw unauthorized('Invalid credentials');

      const valid = await verifyPassword(person.password_hash, password);
      if (!valid) throw unauthorized('Invalid credentials');

      const roles = JSON.parse(person.roles) as string[];
      const tokenPayload = { sub: person.id, roles };

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

      const newAccessToken = await signAccessToken({ sub: payload.sub, roles: payload.roles });
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
    async (request, reply) => {
      // Revoke is handled by expiry — just return 204
      void request.body;
      return reply.status(204).send();
    },
  );

  // suppress unused import warning
  void badRequest;
}
