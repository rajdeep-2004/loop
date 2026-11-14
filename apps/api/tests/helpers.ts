import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { AuthResult } from '@campus/shared';
import { io as connect, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@campus/shared';
import { buildApp } from '../src/app';
import { config } from '../src/config';
import { connectDb, disconnectDb } from '../src/lib/db';
import { ProgramModel, SchoolModel } from '../src/modules/university/university.models';
import { setIo } from '../src/realtime/gateway';
import { attachRealtime } from '../src/realtime/socket';

type Json = Record<string, unknown> | unknown[];
export type Res<T = any> = { status: number; body: T }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type TestContext = { app: FastifyInstance; port: number };
export type TestSocket = Socket<ServerEvents, ClientEvents>;

/** Connects to the test database, builds the app once per file and empties every collection before each test. */
export function useTestApp(options: { realtime?: boolean } = {}): TestContext {
  const context = {} as TestContext;
  let io: ReturnType<typeof attachRealtime> | null = null;
  beforeAll(async () => {
    await connectDb(config.mongodbUri);
    context.app = await buildApp();
    if (options.realtime) {
      // Sockets need a real port. Port 0 lets the OS pick a free one.
      io = attachRealtime(context.app.server);
      await context.app.listen({ port: 0, host: '127.0.0.1' });
      context.port = (context.app.server.address() as { port: number }).port;
    }
    await context.app.ready();
    // Wait for indexes, so unique constraints are active before the first test.
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  });
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  });
  afterAll(async () => {
    if (io) {
      await io.close();
      setIo(null);
    }
    await context.app.close();
    await disconnectDb();
  });
  return context;
}

export async function call<T = any>( // eslint-disable-line @typescript-eslint/no-explicit-any
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: { token?: string; body?: Json } = {},
): Promise<Res<T>> {
  const response = await app.inject({
    method,
    url: `/api/v1${url}`,
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    payload: options.body,
  });
  return { status: response.statusCode, body: (response.body ? response.json() : undefined) as T };
}

let counter = 0;

export type TestUser = AuthResult & { token: string; id: string };

export async function createUser(app: FastifyInstance, overrides: Partial<{ name: string; username: string; email: string; password: string }> = {}): Promise<TestUser> {
  counter += 1;
  const body = {
    name: overrides.name ?? `Student ${counter}`,
    username: overrides.username ?? `student${counter}`,
    email: overrides.email ?? `student${counter}@campus.test`,
    password: overrides.password ?? 'password123',
  };
  const res = await call<{ data: AuthResult }>(app, 'POST', '/auth/signup', { body });
  if (res.status !== 201) throw new Error(`signup failed: ${JSON.stringify(res.body)}`);
  return { ...res.body.data, token: res.body.data.accessToken, id: res.body.data.user.id };
}

export async function seedUniversity() {
  const tech = await SchoolModel.create({ name: 'School of Technology', description: 'Tech', color: '#2F6BFF' });
  const design = await SchoolModel.create({ name: 'School of Design', description: 'Design', color: '#FF4FA3' });
  const cse = await ProgramModel.create({ schoolId: tech._id, name: 'B.Tech CSE', years: 4, sections: ['A', 'B'] });
  const ux = await ProgramModel.create({ schoolId: design._id, name: 'B.Des UX', years: 4, sections: ['A'] });
  return { tech, design, cse, ux };
}

/** Signs up a user and attaches them to a school, program, year and section. */
export async function createStudent(
  app: FastifyInstance,
  place: { schoolId: unknown; programId: unknown; year: number; classSection?: string },
  overrides: Parameters<typeof createUser>[1] = {},
): Promise<TestUser> {
  const user = await createUser(app, overrides);
  const res = await call(app, 'PUT', '/users/me/onboarding', {
    token: user.token,
    body: {
      schoolId: String(place.schoolId),
      programId: String(place.programId),
      year: place.year,
      classSection: place.classSection ?? 'A',
    },
  });
  if (res.status !== 200) throw new Error(`onboarding failed: ${JSON.stringify(res.body)}`);
  return { ...user, user: res.body.data };
}

type UntypedSocket = {
  once: (event: string, handler: (payload: unknown) => void) => void;
  off: (event: string, handler: (payload: unknown) => void) => void;
};

const openSockets: TestSocket[] = [];

/** Opens an authenticated socket and waits until it is connected. */
export function openSocket(port: number, token: string): Promise<TestSocket> {
  return new Promise((resolve, reject) => {
    const socket: TestSocket = connect(`http://127.0.0.1:${port}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    openSockets.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => reject(error));
  });
}

export function closeSockets(): void {
  for (const socket of openSockets.splice(0)) socket.disconnect();
}

/** Resolves with the first payload of an event, or rejects if it does not arrive in time. */
export function nextEvent<E extends keyof ServerEvents>(socket: TestSocket, event: E, timeoutMs = 2000): Promise<Parameters<ServerEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    (socket as unknown as UntypedSocket).once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload as Parameters<ServerEvents[E]>[0]);
    });
  });
}

/** Resolves true if the event does NOT arrive within the window. */
export function noEvent(socket: TestSocket, event: keyof ServerEvents, windowMs = 300): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      (socket as unknown as UntypedSocket).off(event, handler);
      resolve(true);
    }, windowMs);
    (socket as unknown as UntypedSocket).once(event, handler);
  });
}

let messageCounter = 0;
export const clientId = () => `client-msg-${Date.now()}-${(messageCounter += 1)}`;

export async function openDm(app: FastifyInstance, from: TestUser, to: TestUser): Promise<string> {
  const res = await call(app, 'POST', '/conversations/dm', { token: from.token, body: { userId: to.id } });
  if (res.status !== 200) throw new Error(`dm failed: ${JSON.stringify(res.body)}`);
  return res.body.data.id as string;
}

export async function send(app: FastifyInstance, from: TestUser, conversationId: string, body: string, extra: Record<string, unknown> = {}) {
  const res = await call(app, 'POST', `/conversations/${conversationId}/messages`, {
    token: from.token,
    body: { clientMessageId: clientId(), body, ...extra },
  });
  if (res.status !== 201) throw new Error(`send failed: ${JSON.stringify(res.body)}`);
  return res.body.data as import('@campus/shared').Message;
}
