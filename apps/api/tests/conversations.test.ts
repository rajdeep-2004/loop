import { describe, expect, it } from 'vitest';
import { ConversationMemberModel, ConversationModel } from '../src/modules/conversations/conversation.models';
import { MessageModel } from '../src/modules/messages/message.model';
import { call, clientId, createUser, openDm, send, useTestApp } from './helpers';

const ctx = useTestApp();

describe('direct messages', () => {
  it('opens one DM per pair, whoever starts it and however often', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const first = await openDm(ctx.app, a, b);
    const again = await openDm(ctx.app, a, b);
    const reverse = await openDm(ctx.app, b, a);
    expect(again).toBe(first);
    expect(reverse).toBe(first);
    expect(await ConversationModel.countDocuments()).toBe(1);
    expect(await ConversationMemberModel.countDocuments()).toBe(2);
  });

  it('creates a single DM when both students open it at the same moment', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const ids = await Promise.all([openDm(ctx.app, a, b), openDm(ctx.app, b, a), openDm(ctx.app, a, b)]);
    expect(new Set(ids).size).toBe(1);
    expect(await ConversationModel.countDocuments()).toBe(1);
    expect(await ConversationMemberModel.countDocuments()).toBe(2);
  });

  it('allows a second group or club conversation despite the DM uniqueness rule', async () => {
    await ConversationModel.create({ type: 'group', name: 'One' });
    await expect(ConversationModel.create({ type: 'group', name: 'Two' })).resolves.toBeTruthy();
  });

  it('refuses a DM with yourself or with an unknown user', async () => {
    const a = await createUser(ctx.app);
    const self = await call(ctx.app, 'POST', '/conversations/dm', { token: a.token, body: { userId: a.id } });
    expect(self.body.error.code).toBe('cannot_message_self');
    const ghost = await call(ctx.app, 'POST', '/conversations/dm', { token: a.token, body: { userId: '000000000000000000000000' } });
    expect(ghost.status).toBe(404);
  });

  it('keeps an empty DM out of the chat list until the first message', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app, { name: 'Bela Sen' });
    const id = await openDm(ctx.app, a, b);
    expect((await call(ctx.app, 'GET', '/conversations', { token: b.token })).body.data).toHaveLength(0);
    await send(ctx.app, a, id, 'hello');
    const list = await call(ctx.app, 'GET', '/conversations', { token: b.token });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ type: 'dm', title: a.user.name, unreadCount: 1, lastMessage: { body: 'hello' } });
  });
});

describe('messages', () => {
  it('saves one message when the same clientMessageId is sent twice, even at once', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const body = { clientMessageId: clientId(), body: 'once' };
    const results = await Promise.all([
      call(ctx.app, 'POST', `/conversations/${id}/messages`, { token: a.token, body }),
      call(ctx.app, 'POST', `/conversations/${id}/messages`, { token: a.token, body }),
      call(ctx.app, 'POST', `/conversations/${id}/messages`, { token: a.token, body }),
    ]);
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    expect(await MessageModel.countDocuments()).toBe(1);
    const member = await ConversationMemberModel.findOne({ conversationId: id, userId: b.id }).lean();
    expect(member?.unreadCount).toBe(1);
  });

  it('rejects an empty message and one over the length limit; keeps unicode intact', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const empty = await call(ctx.app, 'POST', `/conversations/${id}/messages`, { token: a.token, body: { clientMessageId: clientId(), body: '   ' } });
    expect(empty.status).toBe(400);
    const long = await call(ctx.app, 'POST', `/conversations/${id}/messages`, { token: a.token, body: { clientMessageId: clientId(), body: 'x'.repeat(4001) } });
    expect(long.status).toBe(400);
    const unicode = await send(ctx.app, a, id, 'नमस्ते 👋🏽 café');
    expect(unicode.body).toBe('नमस्ते 👋🏽 café');
  });

  it('hides a conversation and its messages from students who are not in it', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const outsider = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    await send(ctx.app, a, id, 'private');
    expect((await call(ctx.app, 'GET', `/conversations/${id}`, { token: outsider.token })).status).toBe(404);
    expect((await call(ctx.app, 'GET', `/conversations/${id}/messages`, { token: outsider.token })).status).toBe(404);
    const write = await call(ctx.app, 'POST', `/conversations/${id}/messages`, { token: outsider.token, body: { clientMessageId: clientId(), body: 'hi' } });
    expect(write.status).toBe(404);
    expect((await call(ctx.app, 'GET', '/conversations/not-an-id/messages', { token: a.token })).status).toBe(404);
  });

  it('pages history newest first without gaps or repeats', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    for (let i = 1; i <= 7; i += 1) await send(ctx.app, a, id, `m${i}`);
    const first = await call(ctx.app, 'GET', `/conversations/${id}/messages?limit=3`, { token: b.token });
    expect(first.body.data.map((m: { body: string }) => m.body)).toEqual(['m7', 'm6', 'm5']);
    const second = await call(ctx.app, 'GET', `/conversations/${id}/messages?limit=3&cursor=${first.body.nextCursor}`, { token: b.token });
    expect(second.body.data.map((m: { body: string }) => m.body)).toEqual(['m4', 'm3', 'm2']);
    const third = await call(ctx.app, 'GET', `/conversations/${id}/messages?limit=3&cursor=${second.body.nextCursor}`, { token: b.token });
    expect(third.body.data.map((m: { body: string }) => m.body)).toEqual(['m1']);
    expect(third.body.nextCursor).toBeNull();
  });

  it('counts unread messages for the receiver only and clears them on read', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    await send(ctx.app, a, id, 'one');
    const last = await send(ctx.app, a, id, 'two');
    expect((await call(ctx.app, 'GET', '/conversations/unread-total', { token: b.token })).body.data.total).toBe(2);
    expect((await call(ctx.app, 'GET', '/conversations/unread-total', { token: a.token })).body.data.total).toBe(0);

    const read = await call(ctx.app, 'POST', `/conversations/${id}/read`, { token: b.token, body: { messageId: last.id } });
    expect(read.status).toBe(204);
    expect((await call(ctx.app, 'GET', '/conversations/unread-total', { token: b.token })).body.data.total).toBe(0);

    const detail = await call(ctx.app, 'GET', `/conversations/${id}`, { token: a.token });
    expect(detail.body.data.readBy).toEqual([{ userId: b.id, messageId: last.id }]);
  });

  it('never moves the read marker backwards and keeps later messages unread', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const one = await send(ctx.app, a, id, 'one');
    const two = await send(ctx.app, a, id, 'two');
    await send(ctx.app, a, id, 'three');
    await call(ctx.app, 'POST', `/conversations/${id}/read`, { token: b.token, body: { messageId: two.id } });
    await call(ctx.app, 'POST', `/conversations/${id}/read`, { token: b.token, body: { messageId: one.id } });
    const member = await ConversationMemberModel.findOne({ conversationId: id, userId: b.id }).lean();
    expect(String(member?.lastReadMessageId)).toBe(two.id);
    expect(member?.unreadCount).toBe(1);
  });

  it('orders the chat list by latest activity', async () => {
    const me = await createUser(ctx.app);
    const x = await createUser(ctx.app, { name: 'Xavier' });
    const y = await createUser(ctx.app, { name: 'Yamini' });
    const dmX = await openDm(ctx.app, me, x);
    const dmY = await openDm(ctx.app, me, y);
    await send(ctx.app, x, dmX, 'from x');
    await send(ctx.app, y, dmY, 'from y');
    await send(ctx.app, x, dmX, 'x again');
    const list = await call(ctx.app, 'GET', '/conversations', { token: me.token });
    expect(list.body.data.map((c: { title: string }) => c.title)).toEqual(['Xavier', 'Yamini']);
  });

  it('quotes the replied-to message and rejects a reply to a message from another chat', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const c = await createUser(ctx.app);
    const ab = await openDm(ctx.app, a, b);
    const ac = await openDm(ctx.app, a, c);
    const original = await send(ctx.app, a, ab, 'Who is joining the hackathon?');
    const reply = await send(ctx.app, b, ab, 'Me!', { replyToId: original.id });
    expect(reply.replyTo).toMatchObject({ id: original.id, body: 'Who is joining the hackathon?', senderName: a.user.name });
    const cross = await call(ctx.app, 'POST', `/conversations/${ac}/messages`, {
      token: a.token,
      body: { clientMessageId: clientId(), body: 'x', replyToId: original.id },
    });
    expect(cross.body.error.code).toBe('invalid_reference');
  });
});
