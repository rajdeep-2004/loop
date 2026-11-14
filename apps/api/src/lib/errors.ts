/** An expected failure with a stable code the app can branch on. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError('not_found', 404, `${what} not found`);
export const forbidden = (message = 'You are not allowed to do this') =>
  new AppError('forbidden', 403, message);
export const badRequest = (code: string, message: string) => new AppError(code, 400, message);
export const conflict = (code: string, message: string) => new AppError(code, 409, message);

export function isDuplicateKeyError(error: unknown): error is { code: 11000; keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}
