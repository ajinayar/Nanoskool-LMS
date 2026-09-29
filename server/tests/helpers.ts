import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/db.js';
import { seed, DEMO_PASSWORD, ADMIN_PASSWORD } from '../src/seed.js';

export const app = createApp();
export type Seeded = Awaited<ReturnType<typeof seed>>;

export async function resetDb(): Promise<Seeded> {
  if (mongoose.connection.readyState !== 1) await connectDb(process.env.MONGO_URI);
  await mongoose.connection.db!.dropDatabase();
  await Promise.all(mongoose.modelNames().map((m) => mongoose.model(m).syncIndexes()));
  return seed({ quiet: true });
}

export async function closeDb() {
  await mongoose.disconnect();
}

export async function login(identifier: string, password = DEMO_PASSWORD) {
  const r = await request(app).post('/api/auth/login').send({ identifier, password });
  if (r.status !== 200) throw new Error(`login ${identifier} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.accessToken as string;
}

export const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url: string, body?: object) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body ?? {}),
  put: (url: string, body?: object) => request(app).put(url).set('Authorization', `Bearer ${token}`).send(body ?? {}),
  patch: (url: string, body?: object) => request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body ?? {}),
  delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

export const LOGINS = {
  admin: ['admin@nanoskool.in', ADMIN_PASSWORD],
  partner: ['partner@demo.nanoskool.in', DEMO_PASSWORD],
  school: ['school@demo.nanoskool.in', DEMO_PASSWORD],
  school2: ['riverside@demo.nanoskool.in', DEMO_PASSWORD],
  teacher: ['teacher@demo.nanoskool.in', DEMO_PASSWORD],
  teacher2: ['sneha.teacher@demo.nanoskool.in', DEMO_PASSWORD],
  teacher3: ['farhan.teacher@demo.nanoskool.in', DEMO_PASSWORD],
  student: ['aarav.gvps', DEMO_PASSWORD],
  parent: ['parent@demo.nanoskool.in', DEMO_PASSWORD],
} as const;

export async function tokens() {
  const out = {} as Record<keyof typeof LOGINS, string>;
  for (const [k, [id, pw]] of Object.entries(LOGINS)) out[k as keyof typeof LOGINS] = await login(id, pw);
  return out;
}
