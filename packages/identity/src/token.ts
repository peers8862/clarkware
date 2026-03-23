import { SignJWT, jwtVerify } from 'jose';

export interface TokenPayload {
  sub: string;       // PersonId
  type: 'access' | 'refresh';
  roles: string[];
}

function getSecret(key: string): Uint8Array {
  const value = process.env[key];
  if (!value) throw new Error(`${key} environment variable is required`);
  return new TextEncoder().encode(value);
}

export async function signAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecret('JWT_SECRET'));
}

export async function signRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret('JWT_REFRESH_SECRET'));
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_SECRET'));
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_REFRESH_SECRET'));
  return payload as unknown as TokenPayload;
}
