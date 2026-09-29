import fs from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { randomToken } from './tokens.js';

export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'image/heic': 'heic',
  'audio/mpeg': 'mp3',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/octet-stream': 'sb3', // Scratch projects
};

let s3: S3Client | undefined;
function client() {
  if (!s3) {
    s3 = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: !!env.S3_ENDPOINT,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
  }
  return s3;
}

/** Stores a file under an unguessable name and returns its public URL. */
export async function saveFile(buffer: Buffer, mime: string, folder: string, originalName = '') {
  let ext = ALLOWED_MIME[mime] ?? 'bin';
  if (mime === 'application/octet-stream') {
    const e = path.extname(originalName).slice(1).toLowerCase();
    ext = e === 'sb3' || e === 'ino' || e === 'py' ? e : 'bin';
  }
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomToken(18)}.${ext}`;
  if (env.STORAGE_DRIVER === 's3') {
    await client().send(
      new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: buffer, ContentType: mime, ACL: 'public-read' }),
    );
    const base = env.S3_PUBLIC_URL ?? `${env.S3_ENDPOINT}/${env.S3_BUCKET}`;
    return { key, url: `${base.replace(/\/$/, '')}/${key}` };
  }
  const full = path.resolve(env.UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  // Relative by default, so files load through the same origin as the app (dev proxy or nginx)
  return { key, url: `${(env.PUBLIC_API_URL ?? '').replace(/\/$/, '')}/files/${key}` };
}
