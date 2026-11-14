import type { FastifyInstance } from 'fastify';
import { onboardingInput, updateProfileInput } from '@campus/shared';
import { parse } from '../../lib/validate';
import { requireAuth } from '../auth/guard';
import { completeOnboarding, getMe, getUser, updateProfile } from './users.service';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/users/me', async (request) => ({ data: await getMe(request.userId) }));

  app.patch('/users/me', async (request) => ({
    data: await updateProfile(request.userId, parse(updateProfileInput, request.body)),
  }));

  app.put('/users/me/onboarding', async (request) => ({
    data: await completeOnboarding(request.userId, parse(onboardingInput, request.body)),
  }));

  app.get<{ Params: { id: string } }>('/users/:id', async (request) => ({
    data: await getUser(request.params.id),
  }));
}
