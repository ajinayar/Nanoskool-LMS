import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { aiRouter } from './modules/ai/routes.js';
import { assessmentRouter } from './modules/assessment/routes.js';
import { authRouter } from './modules/auth/routes.js';
import { curriculumRouter } from './modules/curriculum/routes.js';
import { dashboardRouter } from './modules/dashboard/routes.js';
import { orgRouter } from './modules/org/routes.js';
import { rewardsRouter } from './modules/rewards/routes.js';
import { journeyRouter, toolCallbackRouter } from './modules/journey/routes.js';
import { skillsRouter } from './modules/skills/routes.js';
import { portfolioRouter } from './modules/journey/portfolio.js';
import { schoolLifeRouter } from './modules/school-life/routes.js';
import { uploadsRouter } from './modules/uploads/routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // Mobile apps and server-to-server calls send no Origin header
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    }),
  );
  // Keep the raw bytes too: tool result callbacks are verified with an HMAC over the exact body
  app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { (req as { rawBody?: Buffer }).rawBody = buf; } }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: env.NODE_ENV === 'test' ? 100_000 : 600, standardHeaders: 'draft-7', legacyHeaders: false }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'up' : 'down', version: '2.0.0' });
  });

  app.use('/api', toolCallbackRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', uploadsRouter);
  app.use('/api', orgRouter);
  app.use('/api', curriculumRouter);
  app.use('/api', assessmentRouter);
  app.use('/api', schoolLifeRouter);
  app.use('/api', dashboardRouter);
  app.use('/api', aiRouter);
  app.use('/api', rewardsRouter);
  app.use('/api', journeyRouter);
  app.use('/api', skillsRouter);
  app.use('/api', portfolioRouter);

  // Locally stored uploads (production should use STORAGE_DRIVER=s3)
  app.use('/files', express.static(path.resolve(env.UPLOAD_DIR), { maxAge: '7d', index: false, dotfiles: 'deny' }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
