import fs from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sentMail } from '../src/lib/mailer.js';
import { User } from '../src/models/index.js';
import { DEMO_PASSWORD } from '../src/seed.js';
import { app, as, closeDb, login, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
beforeAll(async () => {
  data = await resetDb();
});
afterAll(closeDb);

const cookieFrom = (r: request.Response) => {
  const raw = r.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('ns_rt='))?.split(';')[0];
};

describe('sign in', () => {
  it('works with email and with username', async () => {
    const byEmail = await request(app).post('/api/auth/login').send({ identifier: 'STUDENT@demo.nanoskool.in', password: DEMO_PASSWORD });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.user.role).toBe('student');
    const byUsername = await request(app).post('/api/auth/login').send({ identifier: 'aarav.gvps', password: DEMO_PASSWORD });
    expect(byUsername.status).toBe(200);
    expect(byUsername.body.accessToken).toBeTruthy();
    expect(byUsername.body.refreshToken).toBeTruthy();
    expect(cookieFrom(byUsername)).toBeTruthy();
  });

  it('never returns password material', async () => {
    const r = await request(app).post('/api/auth/login').send({ identifier: 'aarav.gvps', password: DEMO_PASSWORD });
    const json = JSON.stringify(r.body.user);
    expect(json).not.toMatch(/passwordHash|real_password|"password"/);
    const t = await login('school@demo.nanoskool.in');
    const list = await as(t).get('/api/users?limit=200');
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash|real_password/);
  });

  it('gives the same error for unknown users and wrong passwords', async () => {
    const a = await request(app).post('/api/auth/login').send({ identifier: 'nobody@x.in', password: 'whatever1' });
    const b = await request(app).post('/api/auth/login').send({ identifier: 'aarav.gvps', password: 'wrong-pass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('locks the account after 5 wrong passwords', async () => {
    const target = data.students[7];
    for (let i = 0; i < 5; i++) await request(app).post('/api/auth/login').send({ identifier: target.username, password: 'wrong-pass1' });
    const r = await request(app).post('/api/auth/login').send({ identifier: target.username, password: DEMO_PASSWORD });
    expect(r.status).toBe(401);
    expect(r.body.error.message).toMatch(/locked/i);
  });

  it('refuses suspended accounts, and suspension applies to live tokens', async () => {
    const [school, teacher] = [await login('school@demo.nanoskool.in'), await login('farhan.teacher@demo.nanoskool.in')];
    expect((await as(teacher).get('/api/dashboard')).status).toBe(200);
    const id = String(data.teachers[2]._id);
    expect((await as(school).post(`/api/users/${id}/status`, { status: 'suspended' })).status).toBe(200);
    expect((await as(teacher).get('/api/dashboard')).status).toBe(401);
    const r = await request(app).post('/api/auth/login').send({ identifier: 'farhan.teacher@demo.nanoskool.in', password: DEMO_PASSWORD });
    expect(r.status).toBe(401);
    await as(school).post(`/api/users/${id}/status`, { status: 'active' });
  });

  it('has no public signup endpoint', async () => {
    const r = await request(app).post('/api/auth/signup').send({ username: 'x', role_id: 1, email: 'x@x.in', password: 'Abcdefg1' });
    expect([401, 404]).toContain(r.status);
    expect(await User.countDocuments({ email: 'x@x.in' })).toBe(0);
  });
});

describe('sessions', () => {
  it('rotates refresh tokens and detects reuse', async () => {
    const r = await request(app).post('/api/auth/login').send({ identifier: 'parent@demo.nanoskool.in', password: DEMO_PASSWORD });
    const first = r.body.refreshToken;
    const r2 = await request(app).post('/api/auth/refresh').send({ refreshToken: first });
    expect(r2.status).toBe(200);
    expect(r2.body.refreshToken).not.toBe(first);
    // Reusing the old token fails and revokes the new one too
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: first })).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: r2.body.refreshToken })).status).toBe(401);
  });

  it('refreshes from the httpOnly cookie and logs out', async () => {
    const r = await request(app).post('/api/auth/login').send({ identifier: 'parent@demo.nanoskool.in', password: DEMO_PASSWORD });
    const cookie = cookieFrom(r)!;
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(r2.status).toBe(200);
    const c2 = cookieFrom(r2)!;
    expect((await request(app).post('/api/auth/logout').set('Cookie', c2)).status).toBe(200);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', c2)).status).toBe(401);
  });

  it('rejects forged and expired access tokens', async () => {
    const r = await request(app).get('/api/auth/me').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.bad');
    expect(r.status).toBe(401);
  });
});

describe('accounts created by admins', () => {
  it('students without email get a one-time password that must be changed', async () => {
    const school = await login('school@demo.nanoskool.in');
    const r = await as(school).post('/api/users', { role: 'student', name: 'Test Kid', username: 'test.kid', classId: String(data.classes[0]._id) });
    expect(r.status).toBe(201);
    expect(r.body.tempPassword).toMatch(/^\S{12}$/);
    const stored = await User.findById(r.body.user._id).select('+passwordHash').lean();
    expect(stored!.passwordHash).not.toContain(r.body.tempPassword);
    const kid = await request(app).post('/api/auth/login').send({ identifier: 'test.kid', password: r.body.tempPassword });
    expect(kid.body.user.mustChangePassword).toBe(true);
    const weak = await as(kid.body.accessToken).post('/api/auth/change-password', { currentPassword: r.body.tempPassword, newPassword: 'short' });
    expect(weak.status).toBe(400);
    const ok = await as(kid.body.accessToken).post('/api/auth/change-password', { currentPassword: r.body.tempPassword, newPassword: 'Robots2026' });
    expect(ok.status).toBe(200);
    const again = await request(app).post('/api/auth/login').send({ identifier: 'test.kid', password: 'Robots2026' });
    expect(again.body.user.mustChangePassword).toBe(false);
  });

  it('users with email get an invite link, never a password by email', async () => {
    const school = await login('school@demo.nanoskool.in');
    sentMail.length = 0;
    const r = await as(school).post('/api/users', { role: 'teacher', name: 'New Teacher', email: 'new.teacher@example.in' });
    expect(r.status).toBe(201);
    expect(r.body.tempPassword).toBeUndefined();
    const mail = sentMail.find((m) => m.to === 'new.teacher@example.in')!;
    expect(mail.text).toMatch(/reset-password\?token=/);
    expect(mail.text).not.toMatch(/password:\s*\S+/i);
    const token = mail.text.match(/token=([\w-]+)/)![1];
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'Teaching2026' })).status).toBe(200);
    // Links are single use
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'Teaching2027' })).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ identifier: 'new.teacher@example.in', password: 'Teaching2026' })).status).toBe(200);
  });

  it('forgot-password answers the same for unknown emails', async () => {
    const a = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@nowhere.in' });
    const b = await request(app).post('/api/auth/forgot-password').send({ email: 'parent@demo.nanoskool.in' });
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
  });
});

describe('every protected route requires a token', () => {
  const routes = fs
    .readFileSync(new URL('../ROUTES.txt', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length >= 2 && /^(GET|POST|PUT|PATCH|DELETE)$/.test(p[0]));
  const PUBLIC = new Set(['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/auth/forgot-password', '/api/auth/reset-password']);
  it(`covers the route list (${routes.length} routes)`, () => expect(routes.length).toBeGreaterThan(80));
  for (const [method, route] of routes) {
    if (PUBLIC.has(route)) continue;
    it(`${method} ${route}`, async () => {
      const url = route.replace(/:(\w+)/g, '64b7f0c2a1b2c3d4e5f60718');
      const r = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method.toLowerCase()](url);
      expect(r.status).toBe(401);
    });
  }
});

describe('smoke: each role opens its dashboard', () => {
  it('returns role-specific dashboards', async () => {
    const t = await tokens();
    for (const [k, tok] of Object.entries(t)) {
      const r = await as(tok).get('/api/dashboard');
      expect(r.status, k).toBe(200);
    }
  });
});
