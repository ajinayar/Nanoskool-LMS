import type { Request } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { Types } from 'mongoose';
import { badRequest } from './errors.js';

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('Validation failed', result.error.flatten());
  }
  return result.data;
}

export const body = <T extends ZodTypeAny>(req: Request, schema: T): z.infer<T> => parse(schema, req.body);
export const query = <T extends ZodTypeAny>(req: Request, schema: T): z.infer<T> => parse(schema, req.query);

export const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

export function idParam(req: Request, name = 'id'): string {
  const raw = req.params[name];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !Types.ObjectId.isValid(v)) throw badRequest(`Invalid ${name}`);
  return v;
}

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().trim().max(100).optional(),
});

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
