import type { Request } from 'express';
import { AuditLog } from '../models/index.js';
import { logger } from './logger.js';

export function audit(req: Request, action: string, entity?: string, entityId?: unknown, meta?: Record<string, unknown>) {
  AuditLog.create({
    actorId: req.user?._id,
    action,
    entity,
    entityId: entityId != null ? String(entityId) : undefined,
    meta,
    ip: req.ip,
  }).catch((err) => logger.error({ err }, 'audit log failed'));
}
