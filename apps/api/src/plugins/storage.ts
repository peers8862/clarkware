import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { initStorage } from '@clark/storage';

export default fp(async function storagePlugin(fastify: FastifyInstance) {
  initStorage({
    endPoint: process.env['MINIO_ENDPOINT'] ?? 'localhost',
    port: parseInt(process.env['MINIO_PORT'] ?? '9000', 10),
    useSSL: process.env['MINIO_USE_SSL'] === 'true',
    accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'clark',
    secretKey: process.env['MINIO_SECRET_KEY'] ?? 'clark_dev_secret',
    bucket: process.env['MINIO_BUCKET'] ?? 'clark-artifacts',
  });

  fastify.log.info('Storage client initialized');
});
