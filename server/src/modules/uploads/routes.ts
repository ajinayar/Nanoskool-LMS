import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { badRequest } from '../../lib/errors.js';
import { ALLOWED_MIME, saveFile } from '../../lib/storage.js';
import { query } from '../../lib/validate.js';
import { authenticate, currentUser } from '../../middleware/auth.js';

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) cb(null, true);
    else cb(badRequest(`File type ${file.mimetype} is not allowed`));
  },
});

// Content uploads (videos, PDFs) are limited to authors; everyone can upload avatars and submissions
const FOLDERS: Record<string, string[]> = {
  content: ['super_admin'],
  avatars: ['super_admin', 'partner', 'school_admin', 'teacher', 'student', 'parent'],
  submissions: ['student'],
  evidence: ['student'],
  assessment: ['student', 'super_admin'],
  assignments: ['teacher', 'school_admin'],
  announcements: ['super_admin', 'partner', 'school_admin', 'teacher'],
  logos: ['super_admin', 'partner', 'school_admin'],
};

uploadsRouter.post('/uploads', authenticate, upload.single('file'), async (req, res) => {
  const me = currentUser(req);
  const { folder } = query(req, z.object({ folder: z.enum(Object.keys(FOLDERS) as [string, ...string[]]).default('avatars') }));
  if (!FOLDERS[folder].includes(me.role)) throw badRequest('You cannot upload to this folder');
  if (!req.file) throw badRequest('No file received (use form field "file")');
  if (folder === 'avatars' && !req.file.mimetype.startsWith('image/')) throw badRequest('Profile pictures must be images');
  const { url, key } = await saveFile(req.file.buffer, req.file.mimetype, `${folder}/${me.schoolId ?? 'global'}`, req.file.originalname);
  res.status(201).json({ url, key, name: req.file.originalname, size: req.file.size, mime: req.file.mimetype });
});
