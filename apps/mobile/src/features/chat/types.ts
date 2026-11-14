import type { Message } from '@campus/shared';

/** A message as the chat screen shows it. `status` exists only on messages still in the outbox. */
export type ChatMessage = Message & { status?: 'sending' | 'failed' };
