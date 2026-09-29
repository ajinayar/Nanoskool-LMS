import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: { code: 'upload_error', message: err.message } });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: { code: 'bad_request', message: 'Validation failed', details: err.errors } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: 'bad_request', message: `Invalid ${err.path}` } });
  }
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    const key = Object.keys((err as { keyValue?: object }).keyValue ?? {}).join(', ');
    return res.status(409).json({ error: { code: 'conflict', message: `A record with this ${key || 'value'} already exists` } });
  }
  if (typeof err === 'object' && err && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'bad_request', message: 'Malformed JSON' } });
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  // Never leak internals to the client
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
}
