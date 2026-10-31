import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'mahakal_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must be set to a random value of at least 32 characters.');
  return secret;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltText, hashText] = stored.split('$');
  if (scheme !== 'scrypt' || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, 'base64url');
  const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export type SessionRole = 'admin' | 'customer';
type SessionPayload = { sub: string; name: string; email: string; role: SessionRole; exp: number };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function createSessionToken(user: { id: string; name: string; email: string }, role: SessionRole = 'admin') {
  const payload: SessionPayload = { sub: user.id, name: user.name, email: user.email, role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', authSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  try {
    const [header, payloadText, signature] = token.split('.');
    if (!header || !payloadText || !signature) return null;
    const body = `${header}.${payloadText}`;
    const expected = createHmac('sha256', authSecret()).update(body).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const payload = JSON.parse(Buffer.from(payloadText, 'base64url').toString()) as SessionPayload;
    if (!payload.sub || !payload.email || !payload.name || !['admin','customer'].includes(payload.role) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: SESSION_TTL_SECONDS };
}
