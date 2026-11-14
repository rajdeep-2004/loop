import { ApiError, api, setSessionLostHandler } from '@/lib/api';
import { getAccessToken, loadRefreshToken, saveRefreshToken, setAccessToken } from '@/lib/tokens';

type Reply = { status: number; body?: unknown };

function mockFetch(replies: (Reply | Error)[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const reply = replies.shift();
    if (!reply) throw new Error('unexpected fetch');
    if (reply instanceof Error) throw reply;
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body } as Response;
  }) as unknown as typeof fetch;
  return calls;
}

const authHeader = (call: { init: RequestInit }) => (call.init.headers as Record<string, string>).Authorization;

beforeEach(async () => {
  setAccessToken(null);
  await saveRefreshToken(null);
  setSessionLostHandler(null);
});

describe('api client', () => {
  it('sends the access token and unwraps data', async () => {
    setAccessToken('access-1');
    const calls = mockFetch([{ status: 200, body: { data: { id: 'u1' } } }]);
    await expect(api.get('/users/me')).resolves.toEqual({ id: 'u1' });
    expect(calls[0]!.url).toContain('/api/v1/users/me');
    expect(authHeader(calls[0]!)).toBe('Bearer access-1');
  });

  it('refreshes once on 401 and repeats the request with the new token', async () => {
    setAccessToken('old');
    await saveRefreshToken('refresh-1');
    const calls = mockFetch([
      { status: 401, body: { error: { code: 'auth_expired', message: 'expired' } } },
      { status: 200, body: { data: { accessToken: 'new', refreshToken: 'refresh-2', user: {} } } },
      { status: 200, body: { data: 'ok' } },
    ]);
    await expect(api.get('/users/me')).resolves.toBe('ok');
    expect(calls[1]!.url).toContain('/auth/refresh');
    expect(authHeader(calls[2]!)).toBe('Bearer new');
    expect(await loadRefreshToken()).toBe('refresh-2');
  });

  it('shares one refresh between requests that fail at the same time', async () => {
    setAccessToken('old');
    await saveRefreshToken('refresh-1');
    const calls = mockFetch([
      { status: 401, body: {} },
      { status: 401, body: {} },
      { status: 200, body: { data: { accessToken: 'new', refreshToken: 'refresh-2', user: {} } } },
      { status: 200, body: { data: 'a' } },
      { status: 200, body: { data: 'b' } },
    ]);
    const results = await Promise.all([api.get('/a'), api.get('/b')]);
    expect(results.sort()).toEqual(['a', 'b']);
    expect(calls.filter((call) => call.url.includes('/auth/refresh'))).toHaveLength(1);
  });

  it('ends the session when the refresh token is rejected', async () => {
    setAccessToken('old');
    await saveRefreshToken('dead');
    const lost = jest.fn();
    setSessionLostHandler(lost);
    mockFetch([{ status: 401, body: {} }, { status: 401, body: {} }]);
    await expect(api.get('/users/me')).rejects.toMatchObject({ code: 'session_expired' });
    expect(lost).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    expect(await loadRefreshToken()).toBeNull();
  });

  it('turns a server error body into an ApiError with its code', async () => {
    mockFetch([{ status: 409, body: { error: { code: 'username_taken', message: 'That username is taken' } } }]);
    const error = await api.post('/auth/signup', {}, false).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'username_taken', status: 409, message: 'That username is taken' });
  });

  it('reports a friendly network error when the server cannot be reached', async () => {
    mockFetch([new TypeError('Network request failed')]);
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'network_error' });
  });
});
