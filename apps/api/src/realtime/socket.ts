import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { sendMessageInput, typingInput, type Ack, type Message } from '@campus/shared';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { createRateLimiter } from '../lib/rateLimiter';
import { parse } from '../lib/validate';
import { verifyAccessToken } from '../modules/auth/tokens';
import { ConversationMemberModel, ConversationModel } from '../modules/conversations/conversation.models';
import { memberIds, requireMember } from '../modules/conversations/conversations.service';
import { sendMessage } from '../modules/messages/messages.service';
import { UserModel } from '../modules/users/user.model';
import { emitToUsers, setIo, trackConnect, trackDisconnect, userRoom, type CampusServer } from './gateway';

const MESSAGES_PER_WINDOW = 30;
const TYPING_PER_WINDOW = 20;
const WINDOW_MS = 10_000;

/** Tells everyone who shares a DM with this user that they came online or went offline. */
async function broadcastPresence(userId: string, online: boolean): Promise<void> {
  const memberships = await ConversationMemberModel.find({ userId }).select('conversationId').lean();
  const dms = await ConversationModel.find({ _id: { $in: memberships.map((m) => m.conversationId) }, type: 'dm' })
    .select('dmKey')
    .lean();
  const partners = dms.map((dm) => dm.dmKey?.split(':').find((id) => id !== userId)).filter((id): id is string => !!id);
  emitToUsers(partners, 'presence', { userId, online });
}

const toAckError = (error: unknown): Ack<never> =>
  error instanceof AppError
    ? { ok: false, error: { code: error.code, message: error.message } }
    : { ok: false, error: { code: 'internal_error', message: 'Something went wrong' } };

export function attachRealtime(httpServer: HttpServer): CampusServer {
  const io: CampusServer = new Server(httpServer, {
    cors: { origin: config.env !== 'production' },
    maxHttpBufferSize: 100_000,
  });
  const messageLimiter = createRateLimiter(MESSAGES_PER_WINDOW, WINDOW_MS);
  const typingLimiter = createRateLimiter(TYPING_PER_WINDOW, WINDOW_MS);

  // The access token is checked once, at the handshake. A socket that is already
  // connected stays valid until it disconnects; the next connection needs a fresh token.
  io.use(async (socket, next) => {
    try {
      const userId = verifyAccessToken(String(socket.handshake.auth?.token ?? ''));
      const user = await UserModel.findById(userId).select('name').lean();
      if (!user) throw new AppError('unauthorized', 401, 'Unknown user');
      socket.data.userId = userId;
      socket.data.name = user.name;
      next();
    } catch (error) {
      next(new Error(error instanceof AppError ? error.code : 'unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));
    if (trackConnect(userId)) void broadcastPresence(userId, true).catch(() => undefined);

    socket.on('message:send', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => undefined;
      try {
        if (!messageLimiter.allow(userId)) throw new AppError('rate_limited', 429, 'You are sending messages too fast');
        const { conversationId, ...rest } = payload ?? ({} as typeof payload);
        const message: Message = await sendMessage(userId, String(conversationId), parse(sendMessageInput, rest));
        reply({ ok: true, data: message });
      } catch (error) {
        if (!(error instanceof AppError)) console.error('message:send failed', error);
        reply(toAckError(error));
      }
    });

    socket.on('typing', async (payload) => {
      try {
        if (!typingLimiter.allow(userId)) return;
        const input = parse(typingInput, payload);
        await requireMember(input.conversationId, userId);
        const others = (await memberIds(input.conversationId)).filter((id) => id !== userId);
        emitToUsers(others, 'typing', { ...input, userId, name: socket.data.name as string });
      } catch {
        // Typing indicators are best effort; a bad event is dropped.
      }
    });

    socket.on('disconnect', () => {
      if (trackDisconnect(userId)) {
        messageLimiter.forget(userId);
        typingLimiter.forget(userId);
        void broadcastPresence(userId, false).catch(() => undefined);
      }
    });
  });

  setIo(io);
  return io;
}
