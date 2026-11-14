import { describe, expect, it } from 'vitest';
import { call, createStudent, createUser, seedUniversity, useTestApp } from './helpers';

const ctx = useTestApp();
const names = (res: { body: { data: { name: string }[] } }) => res.body.data.map((u) => u.name);

describe('people search', () => {
  it('matches the start of any word of the name and the start of the username, case-insensitively', async () => {
    const { tech, cse } = await seedUniversity();
    const place = { schoolId: tech._id, programId: cse._id, year: 2 };
    const me = await createStudent(ctx.app, place, { name: 'Zed Viewer' });
    await createStudent(ctx.app, place, { name: 'Rajdeep Sanyal', username: 'rds' });
    await createStudent(ctx.app, place, { name: 'Sana Rajan', username: 'sana' });
    await createStudent(ctx.app, place, { name: 'Maya Iyer', username: 'rajmaya' });

    expect(names(await call(ctx.app, 'GET', '/users?q=RAJ', { token: me.token }))).toEqual(['Maya Iyer', 'Rajdeep Sanyal', 'Sana Rajan']);
    expect(names(await call(ctx.app, 'GET', '/users?q=sanyal', { token: me.token }))).toEqual(['Rajdeep Sanyal']);
    // Every typed word must start some word of the name, in any order.
    expect(names(await call(ctx.app, 'GET', '/users?q=raj%20san', { token: me.token }))).toEqual(['Rajdeep Sanyal', 'Sana Rajan']);
    expect(names(await call(ctx.app, 'GET', '/users?q=raj%20sany', { token: me.token }))).toEqual(['Rajdeep Sanyal']);
    expect(names(await call(ctx.app, 'GET', '/users?q=deep', { token: me.token }))).toEqual([]);
  });

  it('treats search text as plain text, not as a pattern', async () => {
    const { tech, cse } = await seedUniversity();
    const me = await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 1 });
    await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 1 }, { name: 'Normal Person' });
    const res = await call(ctx.app, 'GET', `/users?q=${encodeURIComponent('.*')}`, { token: me.token });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('filters by school, program, year and tag, and leaves out the searcher and students who have not onboarded', async () => {
    const { tech, design, cse, ux } = await seedUniversity();
    const me = await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 3 }, { name: 'Me Myself' });
    const ai = await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 3 }, { name: 'Ai Fan' });
    await call(ctx.app, 'PATCH', '/users/me', { token: ai.token, body: { interests: ['AI'] } });
    await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 1 }, { name: 'First Year' });
    await createStudent(ctx.app, { schoolId: design._id, programId: ux._id, year: 3 }, { name: 'Designer' });
    await createUser(ctx.app, { name: 'Not Onboarded' });

    expect(names(await call(ctx.app, 'GET', `/users?schoolId=${tech._id}`, { token: me.token }))).toEqual(['Ai Fan', 'First Year']);
    expect(names(await call(ctx.app, 'GET', `/users?year=3`, { token: me.token }))).toEqual(['Ai Fan', 'Designer']);
    expect(names(await call(ctx.app, 'GET', `/users?programId=${ux._id}`, { token: me.token }))).toEqual(['Designer']);
    expect(names(await call(ctx.app, 'GET', `/users?tag=AI&year=3`, { token: me.token }))).toEqual(['Ai Fan']);
  });

  it('pages results', async () => {
    const { tech, cse } = await seedUniversity();
    const me = await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 1 }, { name: 'Zz Me' });
    for (const name of ['A One', 'B Two', 'C Three']) await createStudent(ctx.app, { schoolId: tech._id, programId: cse._id, year: 1 }, { name });
    const first = await call(ctx.app, 'GET', '/users?limit=2', { token: me.token });
    expect(names(first)).toEqual(['A One', 'B Two']);
    const second = await call(ctx.app, 'GET', `/users?limit=2&cursor=${first.body.nextCursor}`, { token: me.token });
    expect(names(second)).toEqual(['C Three']);
    expect(second.body.nextCursor).toBeNull();
  });
});
