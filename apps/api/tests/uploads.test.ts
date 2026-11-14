import { rm } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { config } from '../src/config';
import { createUser, useTestApp } from './helpers';

const ctx = useTestApp();
afterAll(() => rm(config.uploadDir, { recursive: true, force: true }));

export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export function multipartBody(filename: string, contentType: string, data: Buffer) {
  const boundary = '----campustest';
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

async function upload(app: FastifyInstance, token: string, filename: string, type: string, data: Buffer) {
  const body = multipartBody(filename, type, data);
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/uploads/images',
    headers: { ...body.headers, authorization: `Bearer ${token}` },
    payload: body.payload,
  });
  return { status: res.statusCode, body: res.json() };
}

describe('image upload', () => {
  it('stores an image under a server-generated name and serves it back to signed-in users only', async () => {
    const user = await createUser(ctx.app);
    const res = await upload(ctx.app, user.token, '../../evil name.png', 'image/png', PNG);
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^\/api\/v1\/files\/public\/[a-f0-9-]{36}\.png$/);

    const fetched = await ctx.app.inject({ method: 'GET', url: res.body.data.url, headers: { authorization: `Bearer ${user.token}` } });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.headers['content-type']).toBe('image/png');
    expect(fetched.rawPayload.equals(PNG)).toBe(true);

    const anonymous = await ctx.app.inject({ method: 'GET', url: res.body.data.url });
    expect(anonymous.statusCode).toBe(401);
  });

  it('rejects a file that claims to be an image but is not', async () => {
    const user = await createUser(ctx.app);
    const res = await upload(ctx.app, user.token, 'fake.png', 'image/png', Buffer.from('<script>alert(1)</script>'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('unsupported_file_type');
  });

  it('rejects an image over 5 MB', async () => {
    const user = await createUser(ctx.app);
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(ctx.app, user.token, 'big.png', 'image/png', big);
    expect(res.status).toBe(413);
  });

  it('returns 404 for a path that tries to escape the upload folder', async () => {
    const user = await createUser(ctx.app);
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/files/public/..%2F..%2F.env', headers: { authorization: `Bearer ${user.token}` } });
    expect(res.statusCode).toBe(404);
  });

  it('lets a profile use an uploaded image as avatar', async () => {
    const user = await createUser(ctx.app);
    const uploaded = await upload(ctx.app, user.token, 'me.png', 'image/png', PNG);
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${user.token}` },
      payload: { avatarUrl: uploaded.body.data.url },
    });
    expect(res.json().data.avatarUrl).toBe(uploaded.body.data.url);
  });
});
