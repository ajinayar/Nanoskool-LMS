import { Router, type Request, type Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { LANG_CODES } from '../../lib/languages.js';
import { BUDDY_KEYS } from '../../lib/buddies.js';
import { env } from '../../config/env.js';
import { checkPassword, hashPassword, issueResetLink, passwordSchema } from '../../lib/accounts.js';
import { audit } from '../../lib/audit.js';
import { badRequest, unauthorized } from '../../lib/errors.js';
import { sendMail } from '../../lib/mailer.js';
import { randomToken, sha256 } from '../../lib/tokens.js';
import { body } from '../../lib/validate.js';
import { authenticate, currentUser, signAccessToken } from '../../middleware/auth.js';
import { ClassSection, Partner, PasswordReset, RefreshToken, School, User, type Role } from '../../models/index.js';

export const authRouter = Router();

const COOKIE = 'ns_rt';
const cookieOpts = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_DAYS * 86400_000,
});

const limitMessage = { error: { code: 'rate_limited', message: 'Too many attempts, try again in a few minutes' } };
// Schools often share one public IP, so the tight limit is per account and IP, with a looser cap per IP
const loginLimiter = [
  rateLimit({
    windowMs: 15 * 60_000,
    limit: env.NODE_ENV === 'test' ? 10_000 : 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: limitMessage,
  }),
  rateLimit({
    windowMs: 15 * 60_000,
    limit: env.NODE_ENV === 'test' ? 10_000 : 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `${String(req.body?.identifier ?? req.body?.email ?? '').toLowerCase().slice(0, 200)}|${ipKeyGenerator(req.ip ?? '')}`,
    message: limitMessage,
  }),
];

async function issueTokens(req: Request, res: Response, userId: string, role: Role) {
  const refreshToken = randomToken(48);
  await RefreshToken.create({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400_000),
    userAgent: req.get('user-agent')?.slice(0, 200),
  });
  res.cookie(COOKIE, refreshToken, cookieOpts());
  return { accessToken: signAccessToken(userId, role), refreshToken };
}

/** The user plus the organisation context each portal needs. */
async function profile(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw unauthorized();
  const [school, partner, cls, children] = await Promise.all([
    user.schoolId ? School.findById(user.schoolId).select('name code logoUrl partnerId academicYear nanobotBuddies').lean() : null,
    user.partnerId ? Partner.findById(user.partnerId).select('name code').lean() : null,
    user.classId ? ClassSection.findById(user.classId).select('name grade section').lean() : null,
    user.childIds?.length
      ? User.find({ _id: { $in: user.childIds } }).select('name classId schoolId rollNo avatarUrl').populate('classId', 'name grade section').lean()
      : [],
  ]);
  const { passwordHash: _p, failedLogins: _f, lockedUntil: _l, ...safe } = user as Record<string, unknown>;
  return { ...safe, school, partner, class: cls, children };
}

const loginBody = z.object({
  identifier: z.string().trim().min(1).max(200), // email or username
  password: z.string().min(1).max(200),
});

authRouter.post('/login', ...loginLimiter, async (req, res) => {
  const { identifier, password } = body(req, loginBody);
  const id = identifier.toLowerCase();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] }).select('+passwordHash +failedLogins +lockedUntil');
  const fail = () => {
    throw unauthorized('Incorrect sign-in details');
  };
  if (!user) return fail();
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw unauthorized('Account temporarily locked after failed attempts. Try again in 15 minutes.');
  }
  const ok = await checkPassword(password, user.passwordHash);
  if (!ok) {
    user.failedLogins = (user.failedLogins ?? 0) + 1;
    if (user.failedLogins >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60_000);
      user.failedLogins = 0;
    }
    await user.save();
    return fail();
  }
  if (user.status !== 'active') throw unauthorized('Account is suspended. Contact your school.');
  user.failedLogins = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueTokens(req, res, String(user._id), user.role as Role);
  res.json({ ...tokens, user: await profile(String(user._id)) });
});

authRouter.post('/refresh', async (req, res) => {
  const token = (req.body?.refreshToken as string | undefined) ?? req.cookies?.[COOKIE];
  if (!token) throw unauthorized('No refresh token');
  const stored = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    // Reuse of a revoked token suggests theft: revoke every session of that user
    if (stored?.revokedAt) await RefreshToken.updateMany({ userId: stored.userId, revokedAt: null }, { revokedAt: new Date() });
    res.clearCookie(COOKIE, { path: '/api/auth' });
    throw unauthorized('Session expired, please sign in again');
  }
  const user = await User.findById(stored.userId).lean();
  if (!user || user.status !== 'active') throw unauthorized('Account is not active');
  stored.revokedAt = new Date();
  await stored.save();
  const tokens = await issueTokens(req, res, String(user._id), user.role as Role);
  res.json(tokens);
});

authRouter.post('/logout', async (req, res) => {
  const token = (req.body?.refreshToken as string | undefined) ?? req.cookies?.[COOKIE];
  if (token) await RefreshToken.updateOne({ tokenHash: sha256(token) }, { revokedAt: new Date() });
  res.clearCookie(COOKIE, { path: '/api/auth' });
  res.json({ ok: true });
});

authRouter.get('/me', authenticate, async (req, res) => {
  res.json(await profile(currentUser(req).id));
});

authRouter.patch('/me', authenticate, async (req, res) => {
  const data = body(
    req,
    z.object({
      name: z.string().trim().min(1).max(120).optional(),
      phone: z.string().trim().max(30).optional(),
      avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
      prefs: z
        .object({
          language: z.enum(LANG_CODES).optional(),
          calm: z.boolean().optional(),
          readAloud: z.boolean().optional(),
          textSize: z.enum(['normal', 'large', 'xlarge']).optional(),
          learnWay: z.enum(['mixed', 'reading', 'listening', 'pictures']).optional(),
          buddy: z.enum(BUDDY_KEYS).optional(),
        })
        .optional(),
    }),
  );
  const { prefs, ...rest } = data;
  // Preferences are merged one by one so changing one setting keeps the others
  const set: Record<string, unknown> = { ...rest };
  for (const [k, v] of Object.entries(prefs ?? {})) if (v !== undefined) set[`prefs.${k}`] = v;
  await User.updateOne({ _id: currentUser(req).id }, { $set: set });
  res.json(await profile(currentUser(req).id));
});

authRouter.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = body(
    req,
    z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }),
  );
  const user = await User.findById(currentUser(req).id).select('+passwordHash');
  if (!user || !(await checkPassword(currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect');
  if (currentPassword === newPassword) throw badRequest('Choose a password you have not used here before');
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  audit(req, 'password.change', 'User', user._id);
  const tokens = await issueTokens(req, res, String(user._id), user.role as Role);
  res.json({ ok: true, ...tokens });
});

authRouter.post('/forgot-password', ...loginLimiter, async (req, res) => {
  const { email } = body(req, z.object({ email: z.string().trim().email() }));
  const user = await User.findOne({ email: email.toLowerCase(), status: 'active' }).lean();
  if (user) {
    const link = await issueResetLink(user._id, 'reset');
    await sendMail(user.email!, 'Reset your Nanoskool password', `Hello ${user.name},\n\nReset your password here (valid for 1 hour):\n${link}\n\nIf you did not ask for this, ignore this email.`);
  }
  // Same answer either way, so the endpoint cannot be used to discover accounts
  res.json({ ok: true, message: 'If that email is registered, a reset link has been sent.' });
});

authRouter.post('/reset-password', ...loginLimiter, async (req, res) => {
  const { token, password } = body(req, z.object({ token: z.string().min(10), password: passwordSchema }));
  const reset = await PasswordReset.findOne({ tokenHash: sha256(token) });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw badRequest('This link is invalid or has expired');
  const user = await User.findById(reset.userId).select('+passwordHash');
  if (!user) throw badRequest('This link is invalid or has expired');
  user.passwordHash = await hashPassword(password);
  user.mustChangePassword = false;
  user.lockedUntil = undefined;
  await user.save();
  reset.usedAt = new Date();
  await reset.save();
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.json({ ok: true });
});
