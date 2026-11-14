import type { FastifyInstance } from 'fastify';
import { loginInput, refreshInput, signupInput } from '@campus/shared';
import { config } from '../../config';
import { parse } from '../../lib/validate';
import { login, logout, refresh, signup } from './auth.service';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const limited = {
    config: { rateLimit: { max: config.auth.rateLimitMax, timeWindow: config.auth.rateLimitWindow } },
  };

  app.post('/auth/signup', limited, async (request, reply) => {
    const result = await signup(parse(signupInput, request.body));
    return reply.status(201).send({ data: result });
  });

  app.post('/auth/login', limited, async (request) => {
    const input = parse(loginInput, request.body);
    return { data: await login(input.email, input.password) };
  });

  app.post('/auth/refresh', limited, async (request) => {
    return { data: await refresh(parse(refreshInput, request.body).refreshToken) };
  });

  app.post('/auth/logout', async (request, reply) => {
    await logout(parse(refreshInput, request.body).refreshToken);
    return reply.status(204).send();
  });
}
