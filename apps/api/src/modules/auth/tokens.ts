import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { AppError } from '../../lib/errors';

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.auth.accessTokenTtlSeconds });
}

/** Returns the user id, or throws `auth_expired` / `unauthorized`. */
export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'object' && typeof payload.sub === 'string') return payload.sub;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('auth_expired', 401, 'Access token expired');
    }
  }
  throw new AppError('unauthorized', 401, 'Invalid access token');
}

export const newRefreshToken = () => randomBytes(32).toString('hex');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
