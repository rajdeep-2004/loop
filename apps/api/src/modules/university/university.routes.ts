import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { listSchools } from './university.service';

export async function universityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/schools', { preHandler: requireAuth }, async () => ({ data: await listSchools() }));
}
