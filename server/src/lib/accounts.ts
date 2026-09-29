import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env.js';
import { PasswordReset, User, type Role } from '../models/index.js';
import { badRequest } from './errors.js';
import { sendMail } from './mailer.js';
import { randomToken, sha256, tempPassword } from './tokens.js';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function issueResetLink(userId: unknown, purpose: 'reset' | 'invite') {
  const token = randomToken(32);
  const hours = purpose === 'invite' ? 24 * 7 : 1;
  await PasswordReset.create({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + hours * 3600_000),
    purpose,
  });
  return `${env.APP_URL.replace(/\/$/, '')}/reset-password?token=${token}`;
}

export interface NewAccount {
  role: Role;
  name: string;
  email?: string;
  username?: string;
  password?: string;
  [k: string]: unknown;
}

/**
 * Creates a user. Passwords are never stored or emailed in plain text:
 * - with an email address, the user gets an invite link to set their own password;
 * - without one, a one-time password is returned to the admin once, and must be changed at first login.
 */
export async function createAccount(data: NewAccount) {
  if (!data.email && !data.username) throw badRequest('Either email or username is required');
  if (data.password) passwordSchema.parse(data.password);
  const initial = data.password ?? (data.email ? randomToken(24) : tempPassword());
  const { password: _pw, ...rest } = data;
  const user = await User.create({
    ...rest,
    email: data.email || undefined,
    username: data.username || undefined,
    passwordHash: await hashPassword(initial),
    mustChangePassword: true,
  });
  let tempPw: string | undefined;
  if (data.password) {
    tempPw = undefined;
  } else if (data.email) {
    const link = await issueResetLink(user._id, 'invite');
    await sendMail(
      data.email,
      'Welcome to Nanoskool',
      `Hello ${data.name},\n\nAn account has been created for you on Nanoskool.\nSet your password here (link valid for 7 days):\n${link}\n\nYour sign-in: ${data.email}`,
    );
  } else {
    tempPw = initial;
  }
  return { user, tempPassword: tempPw };
}
