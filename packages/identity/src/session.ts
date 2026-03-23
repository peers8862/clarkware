import { createHash, randomBytes } from 'node:crypto';
import { query, queryOne } from '@clark/db';
import type { PersonId } from '@clark/core';

export interface RefreshTokenRecord {
  id: string;
  personId: PersonId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createRefreshTokenRecord(personId: PersonId): Promise<string> {
  const rawToken = randomBytes(48).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const id = randomBytes(16).toString('hex');

  await query(
    `INSERT INTO refresh_tokens (id, person_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [id, personId, tokenHash, expiresAt],
  );

  return rawToken;
}

export async function findRefreshToken(rawToken: string): Promise<RefreshTokenRecord | null> {
  const tokenHash = hashToken(rawToken);
  const row = await queryOne<{
    id: string;
    person_id: string;
    token_hash: string;
    expires_at: Date;
    created_at: Date;
    revoked_at: Date | null;
  }>(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id as PersonId,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1',
    [tokenHash],
  );
}
