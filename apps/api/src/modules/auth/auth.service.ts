import bcrypt from 'bcryptjs';
import type { AuthResult } from '@campus/shared';
import { config } from '../../config';
import { AppError, conflict, isDuplicateKeyError } from '../../lib/errors';
import { UserModel, toNameWords, type UserDoc } from '../users/user.model';
import { presentMe } from '../users/users.presenter';
import { SessionModel } from './session.model';
import { hashToken, newRefreshToken, signAccessToken } from './tokens';

type SignupData = { name: string; username: string; email: string; password: string };

async function issueTokens(user: UserDoc): Promise<AuthResult> {
  const refreshToken = newRefreshToken();
  await SessionModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + config.auth.refreshTokenTtlMs),
  });
  return { user: await presentMe(user), accessToken: signAccessToken(String(user._id)), refreshToken };
}

export async function signup(data: SignupData): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(data.password, config.auth.bcryptRounds);
  try {
    const user = await UserModel.create({
      name: data.name,
      nameWords: toNameWords(data.name),
      username: data.username,
      email: data.email,
      passwordHash,
    });
    return await issueTokens(user.toObject());
  } catch (error) {
    // The unique indexes are the source of truth, so two signups racing for the
    // same username cannot both succeed.
    if (isDuplicateKeyError(error)) {
      if (error.keyPattern?.username) throw conflict('username_taken', 'That username is taken');
      throw conflict('email_taken', 'An account with that email already exists');
    }
    throw error;
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await UserModel.findOne({ email }).lean();
  // Same error for "no such user" and "wrong password", so the response does
  // not reveal which emails have accounts.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) throw new AppError('invalid_credentials', 401, 'Wrong email or password');
  return issueTokens(user);
}

/** Rotation: the old refresh token is deleted in the same step that validates it. */
export async function refresh(refreshToken: string): Promise<AuthResult> {
  const session = await SessionModel.findOneAndDelete({
    tokenHash: hashToken(refreshToken),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) throw new AppError('invalid_refresh_token', 401, 'Please log in again');
  const user = await UserModel.findById(session.userId).lean();
  if (!user) throw new AppError('invalid_refresh_token', 401, 'Please log in again');
  return issueTokens(user);
}

export async function logout(refreshToken: string): Promise<void> {
  await SessionModel.deleteOne({ tokenHash: hashToken(refreshToken) });
}
