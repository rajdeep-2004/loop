import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { AuthResult } from '@campus/shared';
import { buildApp } from '../src/app';
import { config } from '../src/config';
import { connectDb, disconnectDb } from '../src/lib/db';
import { ProgramModel, SchoolModel } from '../src/modules/university/university.models';

type Json = Record<string, unknown> | unknown[];
export type Res<T = any> = { status: number; body: T }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type TestContext = { app: FastifyInstance };

/** Connects to the test database, builds the app once per file and empties every collection before each test. */
export function useTestApp(): TestContext {
  const context = {} as TestContext;
  beforeAll(async () => {
    await connectDb(config.mongodbUri);
    context.app = await buildApp();
    await context.app.ready();
    // Wait for indexes, so unique constraints are active before the first test.
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  });
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
  });
  afterAll(async () => {
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
