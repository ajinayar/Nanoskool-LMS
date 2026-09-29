import crypto from 'node:crypto';

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export function tempPassword() {
  // Readable one-time password for bulk-created accounts (user must change it on first login)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const buf = crypto.randomBytes(12);
  for (const b of buf) out += alphabet[b % alphabet.length];
  return out;
}
