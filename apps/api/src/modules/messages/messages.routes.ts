import type { FastifyInstance } from 'fastify';
import { editMessageInput, reactInput } from '@campus/shared';
import { config } from '../../config';
import { parse } from '../../lib/validate';
import { requireAuth } from '../auth/guard';
import { clearReaction, deleteMessage, editMessage, setReaction } from './messageActions.service';

type IdParams = { Params: { id: string } };

const WRITE_LIMIT = { config: { rateLimit: config.messages.writeRateLimit } };

export async function messagesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.patch<IdParams>('/messages/:id', WRITE_LIMIT, async (request) => ({
    data: await editMessage(request.userId, request.params.id, parse(editMessageInput, request.body).body),
  }));

  app.delete<IdParams>('/messages/:id', WRITE_LIMIT, async (request) => ({
    data: await deleteMessage(request.userId, request.params.id),
  }));

  app.put<IdParams>('/messages/:id/reaction', WRITE_LIMIT, async (request) => ({
    data: await setReaction(request.userId, request.params.id, parse(reactInput, request.body).emoji),
  }));

  app.delete<IdParams>('/messages/:id/reaction', WRITE_LIMIT, async (request) => ({
    data: await clearReaction(request.userId, request.params.id),
  }));
}
