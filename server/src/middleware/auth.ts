import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { User, type Role } from '../models/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export interface AuthUser {
  id: string;
  _id: Types.ObjectId;
  role: Role;
  name: string;
  email?: string | null;
  schoolId?: string;
  partnerId?: string;
  classId?: string;
  childIds: string[];
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccessToken(userId: string, role: Role) {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'nanoskool-api',
  });
}

/** Verifies the bearer token and loads the current user, so suspensions take effect at once. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(unauthorized());
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'nanoskool-api' }) as jwt.JwtPayload;
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
  const user = await User.findById(payload.sub).lean();
  if (!user || user.status !== 'active') return next(unauthorized('Account is not active'));
  req.user = {
    id: String(user._id),
    _id: user._id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    schoolId: user.schoolId ? String(user.schoolId) : undefined,
    partnerId: user.partnerId ? String(user.partnerId) : undefined,
    classId: user.classId ? String(user.classId) : undefined,
    childIds: (user.childIds ?? []).map(String),
    mustChangePassword: !!user.mustChangePassword,
  };
  next();
}

/** Allows only the listed roles. Always use after `authenticate`. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
