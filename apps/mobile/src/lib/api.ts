import type { AuthResult, Page } from '@campus/shared';
import { API_PREFIX, API_URL, REQUEST_TIMEOUT_MS } from './config';
import { getAccessToken, loadRefreshToken, saveRefreshToken, setAccessToken } from './tokens';

/** A failed request, with the server's stable error code when there is one. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = { body?: unknown; form?: FormData; auth?: boolean };

let onSessionLost: (() => void) | null = null;
/** The auth provider registers here to be told when the session can no longer be refreshed. */
export const setSessionLostHandler = (handler: (() => void) | null) => {
  onSessionLost = handler;
};

let refreshing: Promise<boolean> | null = null;

async function send(method: string, path: string, options: Options): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${API_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('network_error', 0, 'Cannot reach Campus. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

async function toError(response: Response): Promise<ApiError> {
  try {
    const json = (await response.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(json.error?.code ?? 'unknown', response.status, json.error?.message ?? 'Request failed');
  } catch {
    return new ApiError('unknown', response.status, 'Request failed');
  }
}

/**
 * Exchanges the stored refresh token for a new pair. Many requests can fail at
 * the same moment when the access token expires, so they all share one refresh call.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await loadRefreshToken();
      if (!refreshToken) return false;
      const response = await send('POST', '/auth/refresh', { body: { refreshToken }, auth: false });
      if (!response.ok) return false;
      const { data } = (await response.json()) as { data: AuthResult };
      setAccessToken(data.accessToken);
      await saveRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function request<T>(method: string, path: string, options: Options = {}): Promise<T> {
  let response = await send(method, path, options);
  if (response.status === 401 && options.auth !== false) {
    // The access token expired: refresh once and repeat the request.
    if (await refreshSession()) {
      response = await send(method, path, options);
    } else {
      setAccessToken(null);
      await saveRefreshToken(null);
      onSessionLost?.();
      throw new ApiError('session_expired', 401, 'Please log in again.');
    }
  }
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const unwrap = async <T>(promise: Promise<{ data: T }>) => (await promise).data;

export const api = {
  get: <T>(path: string) => unwrap(request<{ data: T }>('GET', path)),
  page: <T>(path: string) => request<Page<T>>('GET', path),
  post: <T>(path: string, body?: unknown, auth = true) => unwrap(request<{ data: T }>('POST', path, { body: body ?? {}, auth })),
  put: <T>(path: string, body: unknown) => unwrap(request<{ data: T }>('PUT', path, { body })),
  patch: <T>(path: string, body: unknown) => unwrap(request<{ data: T }>('PATCH', path, { body })),
  /** DELETE that returns the changed resource (for example a message after its reaction was removed). */
  remove: <T>(path: string) => unwrap(request<{ data: T }>('DELETE', path)),
  delete: (path: string, body?: unknown) => request<void>('DELETE', path, body === undefined ? {} : { body }),
  postVoid: (path: string, body: unknown, auth = true) => request<void>('POST', path, { body, auth }),
  upload: <T>(path: string, form: FormData) => unwrap(request<{ data: T }>('POST', path, { form })),
};

export const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
