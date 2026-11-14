import { describe, expect, it } from 'vitest';
import { REACTION_EMOJIS } from '@campus/shared';
import { config } from '../src/config';
import { call, createUser, openDm, send, useTestApp } from './helpers';

const ctx = useTestApp();

describe('message write rate limit', () => {
  it('refuses writes past the per-minute budget with rate_limited', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const message = await send(ctx.app, a, await openDm(ctx.app, a, b), 'hello');
    const react = () =>
      call(ctx.app, 'PUT', `/messages/${message.id}/reaction`, { token: a.token, body: { emoji: REACTION_EMOJIS[0] } });
    for (let i = 0; i < config.messages.writeRateLimit.max; i += 1) expect((await react()).status).toBe(200);
    const blocked = await react();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('rate_limited');
  });
});
