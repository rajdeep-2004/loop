import { afterEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { call, clientId, closeSockets, createUser, nextEvent, noEvent, openDm, openSocket, send, useTestApp } from './helpers';

const ctx = useTestApp({ realtime: true });
afterEach(() => closeSockets());

describe('socket authentication', () => {
  it('rejects a connection without a valid token', async () => {
    await expect(openSocket(ctx.port, 'garbage')).rejects.toThrow('unauthorized');
  });

  it('rejects an expired token with auth_expired so the app knows to refresh', async () => {
    const user = await createUser(ctx.app);
    const expired = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: -10 });
    await expect(openSocket(ctx.port, expired)).rejects.toThrow('auth_expired');
  });
});

describe('live messaging', () => {
  it('delivers a message sent over the socket to the other student and acknowledges the sender', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const socketA = await openSocket(ctx.port, a.token);
    const socketB = await openSocket(ctx.port, b.token);

    const incoming = nextEvent(socketB, 'message:new');
    const ack = await socketA.emitWithAck('message:send', { conversationId: id, clientMessageId: clientId(), body: 'hey' });
    expect(ack.ok).toBe(true);
    const received = await incoming;
    expect(received).toMatchObject({ body: 'hey', conversationId: id, sender: { id: a.id } });
  });

  it('returns the saved message, not a duplicate, when a send is retried with the same id', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const socketA = await openSocket(ctx.port, a.token);
    const payload = { conversationId: id, clientMessageId: clientId(), body: 'retry me' };
    const first = await socketA.emitWithAck('message:send', payload);
    const second = await socketA.emitWithAck('message:send', payload);
    expect(first.ok && second.ok && first.data.id === second.data.id).toBe(true);
  });

  it('answers a bad send with an error ack instead of crashing', async () => {
    const a = await createUser(ctx.app);
    const outsider = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const socket = await openSocket(ctx.port, outsider.token);
    const notMember = await socket.emitWithAck('message:send', { conversationId: id, clientMessageId: clientId(), body: 'let me in' });
    expect(notMember).toMatchObject({ ok: false, error: { code: 'not_found' } });
    const invalid = await socket.emitWithAck('message:send', { conversationId: id, clientMessageId: clientId(), body: '' });
    expect(invalid.ok).toBe(false);
  });

  it('delivers the first DM live to a student who was already connected', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const socketB = await openSocket(ctx.port, b.token);
    const incoming = nextEvent(socketB, 'message:new');
    const id = await openDm(ctx.app, a, b);
    await send(ctx.app, a, id, 'first contact');
    expect((await incoming).body).toBe('first contact');
  });

  it('does not deliver a message to a student outside the conversation', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const outsider = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const socketOutsider = await openSocket(ctx.port, outsider.token);
    const silent = noEvent(socketOutsider, 'message:new');
    await send(ctx.app, a, id, 'secret');
    expect(await silent).toBe(true);
  });

  it('relays typing to the other member only', async () => {
    const a = await createUser(ctx.app, { name: 'Asha' });
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const socketA = await openSocket(ctx.port, a.token);
    const socketB = await openSocket(ctx.port, b.token);
    const typing = nextEvent(socketB, 'typing');
    const echo = noEvent(socketA, 'typing');
    socketA.emit('typing', { conversationId: id, typing: true });
    expect(await typing).toEqual({ conversationId: id, typing: true, userId: a.id, name: 'Asha' });
    expect(await echo).toBe(true);
  });

  it('tells the sender when the other student reads the message', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    const message = await send(ctx.app, a, id, 'read me');
    const socketA = await openSocket(ctx.port, a.token);
    const read = nextEvent(socketA, 'conversation:read');
    await call(ctx.app, 'POST', `/conversations/${id}/read`, { token: b.token, body: { messageId: message.id } });
    expect(await read).toEqual({ conversationId: id, userId: b.id, messageId: message.id });
  });
});

describe('presence', () => {
  it('tells DM partners when a student comes online and goes offline, and reports it in the chat list', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    await send(ctx.app, a, id, 'hi');
    const socketA = await openSocket(ctx.port, a.token);

    const online = nextEvent(socketA, 'presence');
    const socketB = await openSocket(ctx.port, b.token);
    expect(await online).toEqual({ userId: b.id, online: true });
    const list = await call(ctx.app, 'GET', '/conversations', { token: a.token });
    expect(list.body.data[0].peer.online).toBe(true);

    const offline = nextEvent(socketA, 'presence');
    socketB.disconnect();
    expect(await offline).toEqual({ userId: b.id, online: false });
  });

  it('stays online while a second device is still connected', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app);
    const id = await openDm(ctx.app, a, b);
    await send(ctx.app, a, id, 'hi');
    const socketA = await openSocket(ctx.port, a.token);
    const phone = await openSocket(ctx.port, b.token);
    await nextEvent(socketA, 'presence');
    await openSocket(ctx.port, b.token);
    const stillOnline = noEvent(socketA, 'presence');
    phone.disconnect();
    expect(await stillOnline).toBe(true);
  });
});
