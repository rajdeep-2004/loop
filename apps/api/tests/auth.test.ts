import { describe, expect, it } from 'vitest';
import { call, createUser, useTestApp } from './helpers';

const ctx = useTestApp();

describe('auth', () => {
  it('signs up and returns the user with tokens, never the password', async () => {
    const res = await call(ctx.app, 'POST', '/auth/signup', {
      body: { name: 'Asha Rao', username: 'Asha.Rao', email: 'ASHA@campus.test', password: 'password123' },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ name: 'Asha Rao', username: 'asha.rao', email: 'asha@campus.test', onboarded: false });
    expect(res.body.data.accessToken).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('rejects invalid input with a validation error', async () => {
    const res = await call(ctx.app, 'POST', '/auth/signup', {
      body: { name: '', username: 'a b', email: 'nope', password: 'short' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
  });

  it('rejects a duplicate email and a duplicate username', async () => {
    await createUser(ctx.app, { username: 'taken', email: 'taken@campus.test' });
    const sameEmail = await call(ctx.app, 'POST', '/auth/signup', {
      body: { name: 'X', username: 'other', email: 'taken@campus.test', password: 'password123' },
    });
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.error.code).toBe('email_taken');
    const sameUsername = await call(ctx.app, 'POST', '/auth/signup', {
      body: { name: 'X', username: 'TAKEN', email: 'new@campus.test', password: 'password123' },
    });
    expect(sameUsername.status).toBe(409);
    expect(sameUsername.body.error.code).toBe('username_taken');
  });

  it('creates only one account when the same signup is sent twice at once', async () => {
    const body = { name: 'Twin', username: 'twin', email: 'twin@campus.test', password: 'password123' };
    const results = await Promise.all([
      call(ctx.app, 'POST', '/auth/signup', { body }),
      call(ctx.app, 'POST', '/auth/signup', { body }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('logs in with the right password and rejects the wrong one with the same error as an unknown email', async () => {
    await createUser(ctx.app, { email: 'login@campus.test', password: 'password123' });
    const good = await call(ctx.app, 'POST', '/auth/login', { body: { email: 'login@campus.test', password: 'password123' } });
    expect(good.status).toBe(200);
    const wrong = await call(ctx.app, 'POST', '/auth/login', { body: { email: 'login@campus.test', password: 'wrongwrong' } });
    const unknown = await call(ctx.app, 'POST', '/auth/login', { body: { email: 'ghost@campus.test', password: 'password123' } });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('rotates refresh tokens: the old one stops working after one use', async () => {
    const user = await createUser(ctx.app);
    const first = await call(ctx.app, 'POST', '/auth/refresh', { body: { refreshToken: user.refreshToken } });
    expect(first.status).toBe(200);
    expect(first.body.data.refreshToken).not.toBe(user.refreshToken);
    const reused = await call(ctx.app, 'POST', '/auth/refresh', { body: { refreshToken: user.refreshToken } });
    expect(reused.status).toBe(401);
    const next = await call(ctx.app, 'POST', '/auth/refresh', { body: { refreshToken: first.body.data.refreshToken } });
    expect(next.status).toBe(200);
  });

  it('logout revokes the refresh token', async () => {
    const user = await createUser(ctx.app);
    const out = await call(ctx.app, 'POST', '/auth/logout', { body: { refreshToken: user.refreshToken } });
    expect(out.status).toBe(204);
    const after = await call(ctx.app, 'POST', '/auth/refresh', { body: { refreshToken: user.refreshToken } });
    expect(after.status).toBe(401);
  });

  it('protects routes: no token and a bad token are both rejected', async () => {
    expect((await call(ctx.app, 'GET', '/users/me')).status).toBe(401);
    expect((await call(ctx.app, 'GET', '/users/me', { token: 'garbage' })).status).toBe(401);
  });
});
