import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, as, closeDb, resetDb, tokens } from './helpers.js';

let t: Awaited<ReturnType<typeof tokens>>;
beforeAll(async () => {
  await resetDb();
  t = await tokens();
});
afterAll(closeDb);

describe('temporary passwords', () => {
  it('lets an admin create a one-time password for an account with email (e.g. while email is not set up)', async () => {
    const list = await as(t.admin).get('/api/users').query({ q: 'partner@demo.nanoskool.in' });
    const partner = (list.body.items ?? list.body).find((u: { email?: string }) => u.email === 'partner@demo.nanoskool.in');
    expect(partner).toBeTruthy();
    const r = await as(t.admin).post(`/api/users/${partner._id}/reset-password`, { temporary: true });
    expect(r.status).toBe(200);
    expect(r.body.emailed).toBe(false);
    expect(r.body.tempPassword).toBeTruthy();
    const login = await request(app).post('/api/auth/login').send({ identifier: 'partner@demo.nanoskool.in', password: r.body.tempPassword });
    expect(login.status).toBe(200);
    expect(login.body.user.mustChangePassword).toBe(true);
    // without the option, an account with email still gets a link instead
    const link = await as(t.admin).post(`/api/users/${partner._id}/reset-password`, {});
    expect(link.body.emailed).toBe(true);
    expect((await as(t.teacher).post(`/api/users/${partner._id}/reset-password`, { temporary: true })).status).toBe(403);
  });
});
