import type { FastifyInstance } from 'fastify';
import { markReadInput, messagesQuery, pageQuery, sendMessageInput, startDmInput } from '@campus/shared';
import { parse } from '../../lib/validate';
import { requireAuth } from '../auth/guard';
import { listMessages, sendMessage } from '../messages/messages.service';
import { getConversation, listConversations, markRead, startDm, unreadTotal } from './conversations.service';

type IdParams = { Params: { id: string } };

export async function conversationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/conversations', async (request) => listConversations(request.userId, parse(pageQuery, request.query)));

  app.get('/conversations/unread-total', async (request) => ({ data: { total: await unreadTotal(request.userId) } }));

  app.post('/conversations/dm', async (request) => ({
    data: await startDm(request.userId, parse(startDmInput, request.body).userId),
  }));

  app.get<IdParams>('/conversations/:id', async (request) => ({
    data: await getConversation(request.userId, request.params.id),
  }));

  app.get<IdParams>('/conversations/:id/messages', async (request) =>
    listMessages(request.userId, request.params.id, parse(messagesQuery, request.query)),
  );

  app.post<IdParams>(
    '/conversations/:id/messages',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const message = await sendMessage(request.userId, request.params.id, parse(sendMessageInput, request.body));
      return reply.status(201).send({ data: message });
    },
  );

  app.post<IdParams>('/conversations/:id/read', async (request, reply) => {
    await markRead(request.userId, request.params.id, parse(markReadInput, request.body).messageId);
    return reply.status(204).send();
  });
}
