import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  // Never log credentials or tokens
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.refreshToken'],
});
