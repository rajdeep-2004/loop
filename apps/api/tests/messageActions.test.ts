import { afterEach, describe, expect, it } from 'vitest';
import { LIMITS, REACTION_EMOJIS } from '@campus/shared';
import { ConversationMemberModel, ConversationModel } from '../src/modules/conversations/conversation.models';
import { MessageModel } from '../src/modules/messages/message.model';
import { call, closeSockets, createUser, nextEvent, openDm, openSocket, send, useTestApp, type TestUser } from './helpers';

const ctx = useTestApp({ realtime: true });
afterEach(() => closeSockets());

const [THUMB, HEART, LAUGH] = REACTION_EMOJIS;

async function pair() {
  const a = await createUser(ctx.app);
  const b = await createUser(ctx.app);
  const outsider = await createUser(ctx.app);
  const dm = await openDm(ctx.app, a, b);
  return { a, b, outsider, dm };
}

const edit = (user: TestUser, messageId: string, body: unknown) =>
  call(ctx.app, 'PATCH', `/messages/${messageId}`, { token: user.token, body: { body } });
const remove = (user: TestUser, messageId: string) => call(ctx.app, 'DELETE', `/messages/${messageId}`, { token: user.token });
const react = (user: TestUser, messageId: string, emoji: unknown) =>
  call(ctx.app, 'PUT', `/messages/${messageId}/reaction`, { token: user.token, body: { emoji } });
const unreact = (user: TestUser, messageId: string) =>
  call(ctx.app, 'DELETE', `/messages/${messageId}/reaction`, { token: user.token });
const history = async (user: TestUser, dm: string) =>
  (await call(ctx.app, 'GET', `/conversations/${dm}/messages`, { token: user.token })).body.data;
const preview = async (user: TestUser) =>
  (await call(ctx.app, 'GET', '/conversations', { token: user.token })).body.data[0].lastMessage.body;

describe('editing a message', () => {
  it('lets the sender change the text, marks it edited and tells the other member live', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'see you at 5');
    const socketB = await openSocket(ctx.port, b.token);
    const updated = nextEvent(socketB, 'message:updated');

    const res = await edit(a, message.id, '  see you at 6  ');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: message.id, body: 'see you at 6', edited: true });
    expect(await updated).toMatchObject({ id: message.id, body: 'see you at 6', edited: true });
    expect((await history(b, dm))[0]).toMatchObject({ body: 'see you at 6', edited: true });
  });

  it('updates the chat list preview only when the newest message is edited', async () => {
    const { a, b, dm } = await pair();
    const older = await send(ctx.app, a, dm, 'first');
    const newest = await send(ctx.app, a, dm, 'second');
    await edit(a, older.id, 'first, fixed');
    expect(await preview(b)).toBe('second');
    await edit(a, newest.id, 'second, fixed');
    expect(await preview(b)).toBe('second, fixed');
  });

  it('refuses an edit by anyone but the sender, and hides the message from outsiders', async () => {
    const { a, b, outsider, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'mine');
    const other = await edit(b, message.id, 'hijacked');
    expect(other.status).toBe(403);
    expect((await edit(outsider, message.id, 'hijacked')).status).toBe(404);
    expect((await call(ctx.app, 'PATCH', `/messages/${message.id}`, { body: { body: 'x' } })).status).toBe(401);
    expect((await history(a, dm))[0]).toMatchObject({ body: 'mine', edited: false });
  });

  it('rejects empty and over-long text and an unknown message id', async () => {
    const { a, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'hello');
    expect((await edit(a, message.id, '   ')).status).toBe(400);
    expect((await edit(a, message.id, 'x'.repeat(LIMITS.messageMax + 1))).status).toBe(400);
    expect((await edit(a, '000000000000000000000000', 'x')).status).toBe(404);
    expect((await edit(a, 'not-an-id', 'x')).status).toBe(404);
  });

  it('does not mark a message edited when the text is unchanged', async () => {
    const { a, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'same');
    const res = await edit(a, message.id, 'same');
    expect(res.body.data.edited).toBe(false);
  });
});

describe('deleting a message', () => {
  it('leaves a placeholder, erases the content and tells the other member live', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'my password is hunter2');
    await react(b, message.id, THUMB);
    const socketB = await openSocket(ctx.port, b.token);
    const updated = nextEvent(socketB, 'message:updated');

    const res = await remove(a, message.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: message.id, deleted: true, body: '', reactions: [] });
    expect(await updated).toMatchObject({ id: message.id, deleted: true, body: '' });
    expect(await history(b, dm)).toHaveLength(1);
    // The text is gone from the database, not just hidden by the API.
    const stored = await MessageModel.findById(message.id).lean();
    expect(stored).toMatchObject({ body: '', reactions: [] });
    expect(stored?.deletedAt).toBeInstanceOf(Date);
    expect(await preview(b)).toBe('Message deleted');
  });

  it('is safe to repeat', async () => {
    const { a, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'oops');
    const first = await remove(a, message.id);
    const deletedAt = (await MessageModel.findById(message.id).lean())?.deletedAt;
    const second = await remove(a, message.id);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(second.body.data.deleted).toBe(true);
    // The repeat does not move the deletion time.
    expect((await MessageModel.findById(message.id).lean())?.deletedAt).toEqual(deletedAt);
  });

  it('refuses a delete by anyone but the sender', async () => {
    const { a, b, outsider, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'mine');
    expect((await remove(b, message.id)).status).toBe(403);
    expect((await remove(outsider, message.id)).status).toBe(404);
    expect((await history(a, dm))[0]).toMatchObject({ body: 'mine', deleted: false });
  });

  it('keeps the chat list preview when an older message is deleted', async () => {
    const { a, b, dm } = await pair();
    const older = await send(ctx.app, a, dm, 'first');
    await send(ctx.app, a, dm, 'second');
    await remove(a, older.id);
    expect(await preview(b)).toBe('second');
  });

  it('shows a reply to a deleted message with an empty, deleted quote', async () => {
    const { a, b, dm } = await pair();
    const original = await send(ctx.app, a, dm, 'secret plan');
    await send(ctx.app, b, dm, 'ok', { replyToId: original.id });
    await remove(a, original.id);
    const [reply] = await history(b, dm);
    expect(reply.replyTo).toMatchObject({ id: original.id, body: '', deleted: true });
  });

  it('blocks editing and reacting once a message is deleted', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'gone soon');
    await remove(a, message.id);
    const edited = await edit(a, message.id, 'back again');
    expect(edited.status).toBe(409);
    expect(edited.body.error.code).toBe('message_deleted');
    expect((await react(b, message.id, THUMB)).status).toBe(409);
    expect((await MessageModel.findById(message.id).lean())?.body).toBe('');
  });
});

describe('reacting to a message', () => {
  it('lets any member react and tells the other member live', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'we won!');
    const socketA = await openSocket(ctx.port, a.token);
    const updated = nextEvent(socketA, 'message:updated');

    const res = await react(b, message.id, HEART);
    expect(res.status).toBe(200);
    expect(res.body.data.reactions).toEqual([{ emoji: HEART, userIds: [b.id] }]);
    expect((await updated).reactions).toEqual([{ emoji: HEART, userIds: [b.id] }]);
  });

  it('groups members who chose the same emoji', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'we won!');
    await react(a, message.id, THUMB);
    const res = await react(b, message.id, THUMB);
    expect(res.body.data.reactions).toHaveLength(1);
    expect(res.body.data.reactions[0].userIds.sort()).toEqual([a.id, b.id].sort());
  });

  it('keeps one reaction per member: a new emoji replaces the old one, a repeat changes nothing', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'we won!');
    await react(b, message.id, THUMB);
    await react(b, message.id, THUMB);
    expect((await history(a, dm))[0].reactions).toEqual([{ emoji: THUMB, userIds: [b.id] }]);
    const changed = await react(b, message.id, LAUGH);
    expect(changed.body.data.reactions).toEqual([{ emoji: LAUGH, userIds: [b.id] }]);
  });

  it('removes a reaction, and removing twice is harmless', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'we won!');
    await react(a, message.id, THUMB);
    await react(b, message.id, THUMB);
    const first = await unreact(b, message.id);
    expect(first.body.data.reactions).toEqual([{ emoji: THUMB, userIds: [a.id] }]);
    await unreact(a, message.id);
    const again = await unreact(a, message.id);
    expect(again.status).toBe(200);
    expect(again.body.data.reactions).toEqual([]);
  });

  it('stays consistent when both members react and change their minds at the same moment', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'we won!');
    await Promise.all([
      react(a, message.id, THUMB),
      react(b, message.id, THUMB),
      react(a, message.id, HEART),
      react(b, message.id, LAUGH),
      react(a, message.id, THUMB),
      react(b, message.id, HEART),
    ]);
    const stored = await MessageModel.findById(message.id).lean();
    const everyone = stored!.reactions.flatMap((reaction) => reaction.userIds.map(String));
    // Whatever order the database ran them in: one reaction each, no duplicate or empty groups.
    expect(everyone.sort()).toEqual([a.id, b.id].sort());
    expect(new Set(stored!.reactions.map((reaction) => reaction.emoji)).size).toBe(stored!.reactions.length);
    expect(stored!.reactions.every((reaction) => reaction.userIds.length > 0)).toBe(true);
  });

  it('accepts only the fixed set of emoji', async () => {
    const { a, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'hello');
    expect((await react(a, message.id, '🧨')).status).toBe(400);
    expect((await react(a, message.id, '$body')).status).toBe(400);
    expect((await react(a, message.id, { $ne: '' })).status).toBe(400);
  });

  it('hides the message from students outside the conversation', async () => {
    const { a, outsider, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'private');
    expect((await react(outsider, message.id, THUMB)).status).toBe(404);
    expect((await unreact(outsider, message.id)).status).toBe(404);
  });
});

describe('message actions under retries, races and odd messages', () => {
  it('never brings the text back when an edit and a delete arrive together', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'original');
    const [edited, removed] = await Promise.all([edit(a, message.id, 'changed'), remove(a, message.id)]);
    expect([200, 409]).toContain(edited.status);
    expect(removed.status).toBe(200);
    expect((await MessageModel.findById(message.id).lean())?.body).toBe('');
    // Whichever request finished last, the chat list must not show the text of a deleted message.
    expect(await preview(b)).toBe('Message deleted');
  });

  it('repeats the live update and the preview fix when a delete is retried', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'retry me');
    await remove(a, message.id);
    // Simulate a first attempt that saved the delete but failed before the preview was rewritten.
    await ConversationModel.updateOne({ _id: dm }, { 'lastMessage.body': 'retry me' });
    const socketB = await openSocket(ctx.port, b.token);
    const updated = nextEvent(socketB, 'message:updated');
    expect((await remove(a, message.id)).status).toBe(200);
    expect(await updated).toMatchObject({ id: message.id, deleted: true });
    expect(await preview(b)).toBe('Message deleted');
  });

  it('erases attachments and the edited mark when a message is deleted', async () => {
    const { a, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'see file');
    await edit(a, message.id, 'see the file');
    await MessageModel.updateOne(
      { _id: message.id },
      { type: 'file', attachments: [{ url: '/files/x', name: 'notes.pdf', mimeType: 'application/pdf', size: 10 }] },
    );
    const res = await remove(a, message.id);
    expect(res.body.data).toMatchObject({ deleted: true, edited: false, attachments: [] });
    expect((await MessageModel.findById(message.id).lean())?.attachments).toEqual([]);
  });

  it('keeps an edited message editable, reactable and deletable', async () => {
    const { a, b, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'v1');
    await edit(a, message.id, 'v2');
    expect((await edit(a, message.id, 'v3')).body.data).toMatchObject({ body: 'v3', edited: true });
    expect((await react(b, message.id, THUMB)).body.data).toMatchObject({ body: 'v3', edited: true });
    expect((await unreact(b, message.id)).body.data.reactions).toEqual([]);
    expect((await remove(a, message.id)).body.data.deleted).toBe(true);
    expect((await unreact(b, message.id)).status).toBe(409);
  });

  it('reacts to a message stored without a reactions list', async () => {
    const { a, dm } = await pair();
    const message = await send(ctx.app, a, dm, 'old data');
    await MessageModel.collection.updateOne({ _id: (await MessageModel.findById(message.id))!._id }, { $unset: { reactions: '' } });
    const res = await react(a, message.id, THUMB);
    expect(res.status).toBe(200);
    expect(res.body.data.reactions).toEqual([{ emoji: THUMB, userIds: [a.id] }]);
  });

  it('leaves the chat list preview alone when a thread reply is edited or deleted', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const group = await ConversationModel.create({ type: 'group', name: 'Hackathon' });
    await ConversationMemberModel.create([
      { conversationId: group._id, userId: a.id },
      { conversationId: group._id, userId: b.id },
    ]);
    const root = await send(ctx.app, a, String(group._id), 'root message');
    const reply = await send(ctx.app, b, String(group._id), 'in thread', { threadRootId: root.id });
    expect((await edit(b, reply.id, 'in thread, fixed')).status).toBe(200);
    expect((await remove(b, reply.id)).status).toBe(200);
    expect(await preview(a)).toBe('root message');
  });
});

