import { describe, expect, it } from 'vitest';
import { call, createStudent, createUser, seedUniversity, useTestApp } from './helpers';

const ctx = useTestApp();

describe('university and onboarding', () => {
  it('lists schools with their programs', async () => {
    await seedUniversity();
    const user = await createUser(ctx.app);
    const res = await call(ctx.app, 'GET', '/schools', { token: user.token });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const tech = res.body.data.find((s: { name: string }) => s.name === 'School of Technology');
    expect(tech.programs[0]).toMatchObject({ name: 'B.Tech CSE', years: 4, sections: ['A', 'B'] });
  });

  it('onboards a student into a school, program, year and class', async () => {
    const { tech, cse } = await seedUniversity();
    const student = await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 2, classSection: 'B' });
    expect(student.user).toMatchObject({
      onboarded: true,
      year: 2,
      classSection: 'B',
      school: { name: 'School of Technology', color: '#2F6BFF' },
      program: { name: 'B.Tech CSE' },
    });
  });

  it('rejects a program from another school, a year past the program length and an unknown class', async () => {
    const { tech, cse, ux } = await seedUniversity();
    const user = await createUser(ctx.app);
    const base = { schoolId: String(tech._id), programId: String(cse._id), year: 1, classSection: 'A' };
    const wrongProgram = await call(ctx.app, 'PUT', '/users/me/onboarding', { token: user.token, body: { ...base, programId: String(ux._id) } });
    expect(wrongProgram.body.error.code).toBe('invalid_program');
    const wrongYear = await call(ctx.app, 'PUT', '/users/me/onboarding', { token: user.token, body: { ...base, year: 5 } });
    expect(wrongYear.body.error.code).toBe('invalid_year');
    const wrongClass = await call(ctx.app, 'PUT', '/users/me/onboarding', { token: user.token, body: { ...base, classSection: 'Z' } });
    expect(wrongClass.body.error.code).toBe('invalid_class');
  });
});

describe('profile', () => {
  it('updates name, bio, skills and interests, lowercasing and de-duplicating tags', async () => {
    const user = await createUser(ctx.app);
    const res = await call(ctx.app, 'PATCH', '/users/me', {
      token: user.token,
      body: { name: 'New Name', bio: 'Hello 👋', skills: ['React', 'react', ' Node '], interests: ['AI'] },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'New Name', bio: 'Hello 👋', skills: ['react', 'node'], interests: ['ai'] });
  });

  it('rejects a bio over the limit and an avatar that is not a Campus upload', async () => {
    const user = await createUser(ctx.app);
    const longBio = await call(ctx.app, 'PATCH', '/users/me', { token: user.token, body: { bio: 'x'.repeat(201) } });
    expect(longBio.status).toBe(400);
    const badAvatar = await call(ctx.app, 'PATCH', '/users/me', { token: user.token, body: { avatarUrl: 'https://evil.test/a.png' } });
    expect(badAvatar.body.error.code).toBe('invalid_avatar');
  });

  it('shows another student a public profile without the email', async () => {
    const a = await createUser(ctx.app);
    const b = await createUser(ctx.app, { name: 'Bela Sen' });
    const res = await call(ctx.app, 'GET', `/users/${b.id}`, { token: a.token });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Bela Sen');
    expect(res.body.data.email).toBeUndefined();
  });

  it('returns 404 for an unknown or malformed user id', async () => {
    const a = await createUser(ctx.app);
    expect((await call(ctx.app, 'GET', '/users/000000000000000000000000', { token: a.token })).status).toBe(404);
    expect((await call(ctx.app, 'GET', '/users/not-an-id', { token: a.token })).status).toBe(404);
  });
});
