import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { getPresignedUploadUrl, getPresignedDownloadUrl } from '@clark/storage';
import { badRequest, notFound } from '../../errors.js';

export default async function artifactsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /v1/artifacts/upload-url
   * Generate a short-lived presigned PUT URL so the client can upload directly to MinIO.
   * Body: { filename: string; mimeType?: string }
   * Returns: { key, uploadUrl, expiresInSeconds }
   */
  fastify.post<{ Body: { filename: string; mimeType?: string } }>(
    '/artifacts/upload-url',
    async (request) => {
      const { filename } = request.body;
      if (!filename) throw badRequest('filename is required');

      const ext = filename.includes('.') ? '.' + filename.split('.').pop() : '';
      const key = `artifacts/${uuidv4()}${ext}`;
      const uploadUrl = await getPresignedUploadUrl(key, 900); // 15-minute window

      return { key, uploadUrl, expiresInSeconds: 900 };
    },
  );

  /**
   * GET /v1/artifacts/*
   * Returns a short-lived presigned GET URL for a stored artifact.
   * The wildcard captures the full key, e.g. artifacts/uuid.pdf
   */
  fastify.get<{ Params: { '*': string } }>('/artifacts/*', async (request) => {
    const key = request.params['*'];
    if (!key) throw notFound('Artifact key not provided');

    const url = await getPresignedDownloadUrl(key, 900);
    return { url, expiresInSeconds: 900 };
  });
}
