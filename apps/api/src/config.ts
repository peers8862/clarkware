export interface AppConfig {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_USE_SSL: boolean;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
  XMPP_SERVICE: string;
  XMPP_DOMAIN: string;
  XMPP_USERNAME: string;
  XMPP_PASSWORD: string;
  OPENSEARCH_URL: string;
  NODE_ENV: string;
}

export const configSchema = {
  type: 'object',
  required: ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'],
  properties: {
    PORT:                { type: 'integer', default: 3000 },
    DATABASE_URL:        { type: 'string' },
    JWT_SECRET:          { type: 'string' },
    JWT_REFRESH_SECRET:  { type: 'string' },
    MINIO_ENDPOINT:      { type: 'string', default: 'localhost' },
    MINIO_PORT:          { type: 'integer', default: 9000 },
    MINIO_USE_SSL:       { type: 'boolean', default: false },
    MINIO_ACCESS_KEY:    { type: 'string', default: 'clark' },
    MINIO_SECRET_KEY:    { type: 'string', default: 'clark_dev_secret' },
    MINIO_BUCKET:        { type: 'string', default: 'clark-artifacts' },
    XMPP_SERVICE:        { type: 'string', default: 'xmpp://localhost:5222' },
    XMPP_DOMAIN:         { type: 'string', default: 'clark.local' },
    XMPP_USERNAME:       { type: 'string', default: 'api' },
    XMPP_PASSWORD:       { type: 'string', default: 'clark_dev' },
    OPENSEARCH_URL:      { type: 'string', default: 'http://localhost:9200' },
    NODE_ENV:            { type: 'string', default: 'development' },
  },
} as const;
