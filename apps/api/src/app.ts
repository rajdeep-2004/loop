import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { LIMITS } from '@campus/shared';
import { config } from './config';
import { AppError } from './lib/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { conversationsRoutes } from './modules/conversations/conversations.routes';
import { universityRoutes } from './modules/university/university.routes';
import { uploadsRoutes } from './modules/uploads/uploads.routes';
import { usersRoutes } from './modules/users/users.routes';

const API_PREFIX = '/api/v1';

/** Builds the HTTP app without listening, so tests can inject requests into it. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.env === 'test' ? false : { level: 'info' },
    bodyLimit: 1024 * 1024,
  });

  await app.register(helmet);
  // Native apps do not use CORS. Browsers are allowed only outside production (Expo web during development).
  await app.register(cors, { origin: config.env !== 'production' });
  await app.register(rateLimit, { global: false });
  await app.register(multipart, { limits: { fileSize: LIMITS.fileMaxBytes, files: 1 } });

  app.decorateRequest('userId', '');

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.status).send({ error: { code: error.code, message: error.message } });
    }
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: { code: 'rate_limited', message: 'Too many attempts. Try again in a minute.' } });
    }
    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.status(413).send({ error: { code: 'file_too_large', message: 'That file is too large' } });
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: { code: 'bad_request', message: 'The request could not be read' } });
    }
    // Unknown failure: log everything, tell the client nothing about internals.
    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ error: { code: 'internal_error', message: 'Something went wrong' } });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: 'not_found', message: 'Route not found' } }),
  );

  app.get('/health', async () => ({ data: { status: 'ok' } }));

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(usersRoutes);
      await api.register(universityRoutes);
      await api.register(uploadsRoutes);
      await api.register(conversationsRoutes);
    },
    { prefix: API_PREFIX },
  );

  return app;
}
