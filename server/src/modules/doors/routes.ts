/**
 * Doors to performance: the catalogue (super admin), opening doors down the chain
 * (super admin → partner → school, like course grants) and each school's door teams (school admin → teachers).
 */
import { Router } from 'express';
import { z } from 'zod';
import { assertSchoolAccess } from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { body, idParam, objectId } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { Door, DoorGrant, DoorTeam, Partner, School, User } from '../../models/index.js';

export const doorsRouter = Router();
doorsRouter.use(authenticate);

const doorBody = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(['door', 'platform']).optional(),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  audience: z.string().trim().max(60).optional(),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((u) => u === '' || /^https:\/\//.test(u), 'Use an https:// link')
    .optional(),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u === '' || /^https:\/\//.test(u) || /^\/(files|doors)\//.test(u), 'Use an uploaded picture or an https:// link')
    .optional(),
  color: z.string().trim().max(20).optional(),
  position: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

/* -------------------------------------------------------------- Catalogue */

doorsRouter.get('/doors', requireRole('super_admin', 'partner', 'school_admin', 'teacher'), async (req, res) => {
  const me = currentUser(req);
  const all = me.role === 'super_admin' && (req.query as { all?: string }).all === 'true';
  res.json(
    await Door.find(all ? {} : { active: true })
      .sort({ position: 1, name: 1 })
      .lean(),
  );
});

doorsRouter.post('/doors', requireRole('super_admin'), async (req, res) => {
  const d = body(req, doorBody);
  const key = d.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (await Door.exists({ key })) throw badRequest('A door with this name already exists');
  const door = await Door.create({ ...d, key, position: d.position ?? (await Door.countDocuments()) });
  audit(req, 'door.create', 'Door', door._id);
  res.status(201).json(door);
});

doorsRouter.patch('/doors/:id', requireRole('super_admin'), async (req, res) => {
  const door = await Door.findByIdAndUpdate(idParam(req), body(req, doorBody.partial()), { new: true }).lean();
  if (!door) throw notFound('Door');
  audit(req, 'door.update', 'Door', door._id);
  res.json(door);
});

/* -------------------------------------------------------------- Who has which door */

/** Everything the selection grid needs, for the viewer's level: super admin sees partners and schools; a partner sees its schools. */
doorsRouter.get('/doors/access', requireRole('super_admin', 'partner'), async (req, res) => {
  const me = currentUser(req);
  if (me.role === 'super_admin') {
    const [doors, partners, schools, grants] = await Promise.all([
      Door.find({ active: true }).sort({ position: 1 }).lean(),
      Partner.find({}).select('name').sort({ name: 1 }).lean(),
      School.find({}).select('name partnerId city').sort({ name: 1 }).lean(),
      DoorGrant.find({}).select('doorId partnerId schoolId viaPartnerId').lean(),
    ]);
    return res.json({ doors, partners, schools, grants });
  }
  const held = await DoorGrant.find({ partnerId: me.partnerId }).select('doorId').lean();
  const [doors, schools] = await Promise.all([
    Door.find({ _id: { $in: held.map((g) => g.doorId) }, active: true })
      .sort({ position: 1 })
      .lean(),
    School.find({ partnerId: me.partnerId }).select('name partnerId city').sort({ name: 1 }).lean(),
  ]);
  const grants = await DoorGrant.find({ schoolId: { $in: schools.map((s) => s._id) } })
    .select('doorId schoolId viaPartnerId')
    .lean();
  res.json({ doors, partners: [], schools, grants });
});

/** Open or close one door for a partner or a school. Idempotent. */
doorsRouter.put('/door-grants', requireRole('super_admin', 'partner'), async (req, res) => {
  const me = currentUser(req);
  const d = body(
    req,
    z.object({ doorId: objectId, partnerId: objectId.optional(), schoolId: objectId.optional(), open: z.boolean() }).refine((x) => !!x.partnerId !== !!x.schoolId, { message: 'Give either partnerId or schoolId' }),
  );
  if (!(await Door.exists({ _id: d.doorId }))) throw notFound('Door');
  if (me.role === 'partner') {
    if (!d.schoolId) throw forbidden();
    await assertSchoolAccess(me, d.schoolId);
    if (!(await DoorGrant.exists({ doorId: d.doorId, partnerId: me.partnerId }))) throw forbidden('This door is not open for your organisation');
  } else {
    if (d.partnerId && !(await Partner.exists({ _id: d.partnerId }))) throw notFound('Partner');
    if (d.schoolId && !(await School.exists({ _id: d.schoolId }))) throw notFound('School');
  }
  const key = d.partnerId ? { doorId: d.doorId, partnerId: d.partnerId } : { doorId: d.doorId, schoolId: d.schoolId };
  if (d.open) {
    const existing = await DoorGrant.findOne(key).lean();
    if (!existing) await DoorGrant.create({ ...key, grantedBy: me.id, viaPartnerId: me.role === 'partner' ? me.partnerId : undefined });
  } else {
    await DoorGrant.deleteMany(key);
    // Closing a partner's door closes it for the schools that partner opened it for
    if (d.partnerId) {
      const schools = await School.find({ partnerId: d.partnerId }).select('_id').lean();
      await DoorGrant.deleteMany({ doorId: d.doorId, schoolId: { $in: schools.map((s) => s._id) }, viaPartnerId: d.partnerId });
    }
  }
  audit(req, d.open ? 'door.open' : 'door.close', 'Door', d.doorId, key);
  res.json({ ok: true, open: d.open });
});

/* -------------------------------------------------------------- A school's doors and teams */

doorsRouter.get('/schools/:id/doors', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const schoolId = idParam(req);
  await assertSchoolAccess(me, schoolId);
  const school = await School.findById(schoolId).select('name partnerId').lean();
  if (!school) throw notFound('School');
  const [doors, grants, partnerGrants, teams, teachers] = await Promise.all([
    Door.find({ active: true }).sort({ position: 1 }).lean(),
    DoorGrant.find({ schoolId }).lean(),
    school.partnerId ? DoorGrant.find({ partnerId: school.partnerId }).select('doorId').lean() : Promise.resolve([]),
    DoorTeam.find({ schoolId }).populate('teacherId', 'name email avatarUrl').lean(),
    User.find({ schoolId, role: 'teacher', status: 'active' }).select('name email avatarUrl').sort({ name: 1 }).lean(),
  ]);
  const partnerHas = new Set(partnerGrants.map((g) => String(g.doorId)));
  res.json({
    school: { _id: school._id, name: school.name },
    teachers,
    doors: doors.map((d) => {
      const g = grants.find((x) => String(x.doorId) === String(d._id));
      return {
        ...d,
        open: !!g,
        via: g ? (g.viaPartnerId ? 'partner' : 'nanoskool') : null,
        partnerHas: partnerHas.has(String(d._id)), // the partner could open it for this school
        team: teams.filter((t) => String(t.doorId) === String(d._id)).map((t) => ({ teacher: t.teacherId, lead: t.lead })),
      };
    }),
  });
});

/** Set the teachers on one door at a school (replaces the list). The door must be open for the school. */
doorsRouter.put('/schools/:id/doors/:doorId/team', requireRole('super_admin', 'partner', 'school_admin'), async (req, res) => {
  const me = currentUser(req);
  const schoolId = idParam(req);
  const doorId = objectId.parse((req.params as { doorId: string }).doorId);
  await assertSchoolAccess(me, schoolId);
  const d = body(req, z.object({ teacherIds: z.array(objectId).max(100), leadId: objectId.nullable().optional() }));
  if (!(await DoorGrant.exists({ doorId, schoolId }))) throw badRequest('This door is not open for the school yet');
  const ids = [...new Set(d.teacherIds)];
  const ok = await User.countDocuments({ _id: { $in: ids }, schoolId, role: 'teacher' });
  if (ok !== ids.length) throw badRequest('Choose teachers from this school');
  if (d.leadId && !ids.includes(d.leadId)) throw badRequest('The lead must be on the team');
  await DoorTeam.deleteMany({ doorId, schoolId, teacherId: { $nin: ids } });
  for (const t of ids) await DoorTeam.updateOne({ doorId, schoolId, teacherId: t }, { $set: { lead: t === d.leadId }, $setOnInsert: { addedBy: me.id } }, { upsert: true });
  audit(req, 'door.team', 'Door', doorId, { schoolId, teachers: ids.length });
  res.json({ ok: true, teachers: ids.length });
});

/** A teacher's doors: the ones their school admin put them on (only while the door is open for the school). */
doorsRouter.get('/me/doors', requireRole('teacher'), async (req, res) => {
  const me = currentUser(req);
  const mine = await DoorTeam.find({ teacherId: me.id, schoolId: me.schoolId }).lean();
  const open = await DoorGrant.find({ schoolId: me.schoolId, doorId: { $in: mine.map((m) => m.doorId) } })
    .select('doorId')
    .lean();
  const openIds = new Set(open.map((g) => String(g.doorId)));
  const doors = await Door.find({ _id: { $in: [...openIds] }, active: true })
    .sort({ position: 1 })
    .lean();
  const teams = await DoorTeam.find({ schoolId: me.schoolId, doorId: { $in: [...openIds] } })
    .populate('teacherId', 'name avatarUrl')
    .lean();
  res.json(
    doors.map((d) => ({
      ...d,
      lead: !!mine.find((m) => String(m.doorId) === String(d._id))?.lead,
      team: teams.filter((t) => String(t.doorId) === String(d._id)).map((t) => ({ teacher: t.teacherId, lead: t.lead })),
    })),
  );
});
