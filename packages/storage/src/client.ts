import * as Minio from 'minio';
import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

export interface StorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export interface PresignedUrlOptions {
  key: string;
  expirySeconds?: number;
}

export interface UploadResult {
  storageUri: string;
  checksum: string;
  checksumAlgorithm: 'sha256';
  sizeBytes: number;
}

let minioClient: Minio.Client | null = null;
let defaultBucket = 'clark-artifacts';

export function initStorage(config: StorageConfig): void {
  defaultBucket = config.bucket;
  minioClient = new Minio.Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
}

function getClient(): Minio.Client {
  if (!minioClient) {
    throw new Error('Storage client not initialized. Call initStorage() first.');
  }
  return minioClient;
}

export async function ensureBucketExists(bucket = defaultBucket): Promise<void> {
  const client = getClient();
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
  }
}

/**
 * Upload a buffer or stream directly, computing SHA-256 checksum in-flight.
 * Returns the canonical storage URI plus integrity metadata.
 */
export async function uploadObject(
  key: string,
  data: Buffer | Readable,
  mimeType: string,
  bucket = defaultBucket,
): Promise<UploadResult> {
  const client = getClient();
  const hash = createHash('sha256');

  let sizeBytes = 0;
  let buffer: Buffer;

  if (Buffer.isBuffer(data)) {
    buffer = data;
    hash.update(buffer);
    sizeBytes = buffer.byteLength;
  } else {
    // Stream — collect into buffer while hashing
    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      chunks.push(buf);
      hash.update(buf);
      sizeBytes += buf.byteLength;
    }
    buffer = Buffer.concat(chunks);
  }

  const checksum = hash.digest('hex');

  await client.putObject(bucket, key, buffer, sizeBytes, { 'Content-Type': mimeType });

  const storageUri = `s3://${bucket}/${key}`;
  return { storageUri, checksum, checksumAlgorithm: 'sha256', sizeBytes };
}

export async function getPresignedUploadUrl(
  key: string,
  expirySeconds = 3600,
  bucket = defaultBucket,
): Promise<string> {
  return getClient().presignedPutObject(bucket, key, expirySeconds);
}

export async function getPresignedDownloadUrl(
  key: string,
  expirySeconds = 3600,
  bucket = defaultBucket,
): Promise<string> {
  return getClient().presignedGetObject(bucket, key, expirySeconds);
}

export async function deleteObject(key: string, bucket = defaultBucket): Promise<void> {
  await getClient().removeObject(bucket, key);
}

/**
 * Verify integrity of a stored object by re-computing its SHA-256 and comparing.
 */
export async function verifyChecksum(
  key: string,
  expectedChecksum: string,
  bucket = defaultBucket,
): Promise<boolean> {
  const client = getClient();
  const stream = await client.getObject(bucket, key);
  const hash = createHash('sha256');
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex') === expectedChecksum;
}
