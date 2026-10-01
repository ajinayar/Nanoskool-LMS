import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DOORS, seedDoors } from '../src/lib/doors.js';
import { Door, School, User } from '../src/models/index.js';
import { as, closeDb, resetDb, tokens, type Seeded } from './helpers.js';

let data: Seeded;
let t: Awaited<ReturnType<typeof tokens>>;
let door: string; // ShaktiMath
let other: string; // Indus MUN
const sid = () => String(data.school._id);
const pid = () => String(data.partner._id);
beforeAll(async () => {
  data = await resetDb();
  await seedDoors();
  t = await tokens();
  door = String((await Door.findOne({ key: 'shaktimath' }).lean())!._id);
  other = String((await Door.findOne({ key: 'indus-mun' }).lean())!._id);
});
afterAll(closeDb);

describe('doors to performance', () => {
  it('has the 8 doors to learning and 4 support platforms from nanoskool.com, once', async () => {
    // An install seeded before the rename gets the new name and logo, unless someone changed them
    await Door.updateOne({ key: 'robotics-ai' }, { name: 'Robotics & AI Curriculum', logoUrl: '/doors/robotics-ai.png' });
    await Door.updateOne({ key: 'thinkquest' }, { name: 'ThinkQuest Olympiad' });
    await seedDoors();
    const robo = (await Door.findOne({ key: 'robotics-ai' }).lean())!;
    expect([robo.name, robo.logoUrl]).toEqual(['Namo Robo', '/doors/namo-robo.png']);
    expect((await Door.findOne({ key: 'thinkquest' }).lean())!.name).toBe('ThinkQuest Olympiad');
    await Door.updateOne({ key: 'thinkquest' }, { name: 'ThinkQuest' });
    const list = (await as(t.school).get('/api/doors')).body;
    expect(list).toHaveLength(12);
    expect(list.filter((d: { kind: string }) => d.kind === 'door')).toHaveLength(8);
    expect(list.map((d: { name: string }) => d.name)).toEqual(DOORS.map((d) => d.name));
    expect((await as(t.student).get('/api/doors')).status).toBe(403);
    expect(list.find((d: { key: string }) => d.key === 'thinkquest').logoUrl).toBe('/doors/thinkquest.png');
    expect(list.filter((d: { logoUrl?: string }) => d.logoUrl)).toHaveLength(12); // every door and platform has its logo
  });

  it('only a super admin edits the catalogue', async () => {
    expect((await as(t.partner).patch(`/api/doors/${door}`, { tagline: 'x' })).status).toBe(403);
    const r = await as(t.admin).patch(`/api/doors/${door}`, { tagline: 'Understand · Practise · Progress', logoUrl: '/files/doors/shaktimath.png' });
    expect(r.body.logoUrl).toBe('/files/doors/shaktimath.png');
    expect((await as(t.admin).patch(`/api/doors/${door}`, { url: 'http://insecure' })).status).toBe(400);
  });

  it('opens down the chain: super admin → partner → school, like courses', async () => {
    // A partner cannot open a door it does not hold
    expect((await as(t.partner).put('/api/door-grants', { doorId: door, schoolId: sid(), open: true })).status).toBe(403);
    expect((await as(t.admin).put('/api/door-grants', { doorId: door, partnerId: pid(), open: true })).status).toBe(200);
    const partnerView = (await as(t.partner).get('/api/doors/access')).body;
    expect(partnerView.doors.map((d: { _id: string }) => d._id)).toEqual([door]);
    expect(partnerView.schools.every((s: { partnerId: string }) => s.partnerId === pid())).toBe(true);
    // Held by the partner is not enough: the school is not open until the partner opens it
    let mine = (await as(t.school).get(`/api/schools/${sid()}/doors`)).body;
    const sm = () => mine.doors.find((d: { _id: string }) => d._id === door);
    expect(sm().open).toBe(false);
    expect(sm().partnerHas).toBe(true);
    expect((await as(t.partner).put('/api/door-grants', { doorId: door, schoolId: sid(), open: true })).status).toBe(200);
    expect((await as(t.partner).put('/api/door-grants', { doorId: door, schoolId: sid(), open: true })).status).toBe(200); // idempotent
    mine = (await as(t.school).get(`/api/schools/${sid()}/doors`)).body;
    expect(sm().open).toBe(true);
    expect(sm().via).toBe('partner');
    // Super admin can open a door straight for a school
    await as(t.admin).put('/api/door-grants', { doorId: other, schoolId: sid(), open: true });
    mine = (await as(t.school).get(`/api/schools/${sid()}/doors`)).body;
    expect(mine.doors.find((d: { _id: string }) => d._id === other).via).toBe('nanoskool');
    // Other schools cannot look
    expect((await as(t.school2).get(`/api/schools/${sid()}/doors`)).status).toBe(403);
  });

  it('school admins put teachers on a door; teachers see their doors', async () => {
    const [a, b] = data.teachers.filter((x) => String(x.schoolId) === sid()).map((x) => String(x._id));
    const outsider = await User.findOne({ role: 'teacher', schoolId: { $ne: data.school._id } }).lean();
    if (outsider) expect((await as(t.school).put(`/api/schools/${sid()}/doors/${door}/team`, { teacherIds: [String(outsider._id)] })).status).toBe(400);
    const closed = String((await Door.findOne({ key: 'school-farm' }).lean())!._id);
    expect((await as(t.school).put(`/api/schools/${sid()}/doors/${closed}/team`, { teacherIds: [a] })).status).toBe(400); // not open
    expect((await as(t.school).put(`/api/schools/${sid()}/doors/${door}/team`, { teacherIds: [a, b], leadId: a })).status).toBe(200);
    const mine = (await as(t.school).get(`/api/schools/${sid()}/doors`)).body;
    const team = mine.doors.find((d: { _id: string }) => d._id === door).team;
    expect(team).toHaveLength(2);
    expect(team.find((x: { lead: boolean }) => x.lead).teacher._id).toBe(a);
    const teacherDoors = (await as(t.teacher).get('/api/me/doors')).body;
    const me = await User.findOne({ email: 'teacher@demo.nanoskool.in' }).lean();
    if ([a, b].includes(String(me!._id))) expect(teacherDoors.map((d: { key: string }) => d.key)).toContain('shaktimath');
    // Replacing the list removes a teacher
    await as(t.school).put(`/api/schools/${sid()}/doors/${door}/team`, { teacherIds: [b] });
    expect((await as(t.school).get(`/api/schools/${sid()}/doors`)).body.doors.find((d: { _id: string }) => d._id === door).team).toHaveLength(1);
  });

  it('closing a partner’s door closes it for the schools the partner opened it for', async () => {
    await as(t.admin).put('/api/door-grants', { doorId: door, partnerId: pid(), open: false });
    const mine = (await as(t.school).get(`/api/schools/${sid()}/doors`)).body;
    expect(mine.doors.find((d: { _id: string }) => d._id === door).open).toBe(false);
    expect(mine.doors.find((d: { _id: string }) => d._id === other).open).toBe(true); // opened directly by Nanoskool, untouched
    expect((await School.countDocuments()) > 0).toBe(true);
  });
});
