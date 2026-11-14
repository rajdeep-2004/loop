import type { FastifyRequest } from 'fastify';
import { AppError } from '../../lib/errors';
import { verifyAccessToken } from './tokens';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by requireAuth. Empty string on unauthenticated routes. */
    userId: string;
  }
}

/** preHandler: rejects the request unless it carries a valid Bearer token. */
export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('unauthorized', 401, 'Missing access token');
  }
  request.userId = verifyAccessToken(header.slice('Bearer '.length));
}
