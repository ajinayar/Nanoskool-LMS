import { Router } from 'express';
import { assertStudentAccess } from '../../lib/access.js';
import { badRequest } from '../../lib/errors.js';
import { idParam } from '../../lib/validate.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { claimDaily, rewardsFor, XP_RULES } from './engine.js';

export const rewardsRouter = Router();
rewardsRouter.use(authenticate);

/** The signed-in student's stars / XP, level, streak, badges and today's quests. */
rewardsRouter.get('/rewards/me', requireRole('student'), async (req, res) => {
  res.json({ ...(await rewardsFor(currentUser(req).id)), rules: XP_RULES });
});

/** Open today's reward. Only unlocked after some real learning today, once per school day. */
rewardsRouter.post('/rewards/claim', requireRole('student'), async (req, res) => {
  const me = currentUser(req);
  const r = await claimDaily(me.id);
  if (!r.ok) throw badRequest(r.reason);
  res.json({ gained: r.gained, ...(await rewardsFor(me.id)) });
});

/** Read-only view for parents, teachers and school staff who can see this student. */
rewardsRouter.get('/rewards/students/:id', async (req, res) => {
  const student = await assertStudentAccess(currentUser(req), idParam(req));
  res.json(await rewardsFor(String(student._id)));
});
