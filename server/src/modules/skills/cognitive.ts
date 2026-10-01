/**
 * Part 3 · Cognitive profile ("Thinking Puzzles"): the child's thinking strengths from puzzles with right answers.
 * Taking the puzzles uses the shared engine (/assessment/me?framework=cognitive); this file has the profile,
 * the studio overview, norms and erasing.
 */
import { Router } from 'express';
import { assertStudentAccess } from '../../lib/access.js';
import { audit } from '../../lib/audit.js';
import { COG_AREAS, cognitiveProfile, eraseCognitive } from '../../lib/cognitive.js';
import { rebuildNorms } from '../../lib/psyQuality.js';
import { idParam } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { AssessmentAttempt, AssessmentForm, AssessmentItem, PsyNorm, Skill, User } from '../../models/index.js';

export const cognitiveRouter = Router();
const staffRoles = ['super_admin', 'partner', 'school_admin', 'teacher'];

cognitiveRouter.get('/students/:id/cognitive', authenticate, async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const p = await cognitiveProfile(student._id);
  // Without a parent's permission staff see nothing (the parent can still see and erase what exists)
  if (!p.consent && staffRoles.includes(me.role)) return res.json({ ...p, withheld: true, areas: [], strengths: [], growing: [] });
  res.json(p);
});

cognitiveRouter.delete('/students/:id/cognitive', authenticate, requireRole('parent', 'school_admin', 'super_admin'), async (req, res) => {
  const me = currentUser(req);
  const student = await assertStudentAccess(me, idParam(req));
  const removed = await eraseCognitive(student._id);
  await User.updateOne({ _id: student._id }, { 'consent.cognitive': false, 'consent.at': new Date(), 'consent.by': me.id });
  audit(req, 'cognitive.erase', 'User', student._id, removed);
  res.json({ ok: true, removed });
});

/** Studio overview: each thinking area with how many puzzles it has per stage, children reached and norms. */
cognitiveRouter.get('/cognitive/overview', authenticate, requireRole('super_admin'), async (_req, res) => {
  const [areas, items, forms, attempts] = await Promise.all([
    Skill.find({ framework: 'cognitive' }).sort({ position: 1 }).lean(),
    AssessmentItem.find({ framework: 'cognitive' }).select('skills grades status stimulus timeSec').lean(),
    AssessmentForm.find({ framework: 'cognitive', status: 'published' }).select('grade itemIds').lean(),
    AssessmentAttempt.countDocuments({ framework: 'cognitive', status: 'scored' }),
  ]);
  const norms = await PsyNorm.find({ skillId: { $in: areas.map((a) => a._id) } })
    .select('skillId grade n')
    .lean();
  const meta = new Map(COG_AREAS.map((a) => [a.key, a]));
  const stageOf = (g: number[]) => (g.some((x) => x <= 3) ? 'little' : g.some((x) => x <= 7) ? 'junior' : 'senior');
  res.json({
    attempts,
    grades: forms.map((f) => f.grade).sort((a, b) => (a ?? 0) - (b ?? 0)),
    areas: areas.map((a) => {
      const mine = items.filter((i) => i.skills.some((s) => String(s.skillId) === String(a._id)));
      const m = a.key ? meta.get(a.key) : undefined;
      const sample = mine.find((i) => i.status === 'published');
      return {
        _id: a._id,
        key: a.key,
        name: a.name,
        child: a.habit || m?.child,
        icon: m?.icon ?? '🧩',
        color: a.color,
        description: a.description,
        active: a.active,
        puzzles: { little: mine.filter((i) => stageOf(i.grades) === 'little').length, junior: mine.filter((i) => stageOf(i.grades) === 'junior').length, senior: mine.filter((i) => stageOf(i.grades) === 'senior').length },
        kinds: { timed: mine.filter((i) => i.timeSec).length, memory: mine.filter((i) => i.stimulus).length },
        sampleId: sample?._id ?? null,
        normedGrades: norms.filter((n) => String(n.skillId) === String(a._id) && (n.n ?? 0) >= 30).map((n) => n.grade),
      };
    }),
  });
});

cognitiveRouter.post('/cognitive/norms/rebuild', authenticate, requireRole('super_admin'), async (req, res) => {
  const r = await rebuildNorms('cognitive');
  audit(req, 'cognitive.norms', 'PsyNorm', undefined, r);
  res.json(r);
});
