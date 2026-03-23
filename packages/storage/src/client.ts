import * as Minio from 'minio';

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
