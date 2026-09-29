import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Older uploads were saved with a full address such as http://localhost:4000/files/...
 * Browsers that cannot reach port 4000 directly (the Claude in-app browser, a phone on
 * the same Wi-Fi, a deployed site) then show a broken image. When PUBLIC_API_URL is not
 * set, rewrite those saved links to the relative /files/... form, which is served through
 * the web app's proxy. Safe to run on every start: it only touches matching strings.
 */
const LOCAL_FILES = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/files\//g;

function rewrite(value: unknown): { value: unknown; changed: boolean } {
  if (typeof value === 'string') {
    if (!value.includes('/files/')) return { value, changed: false };
    const next = value.replace(LOCAL_FILES, '/files/');
    return { value: next, changed: next !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const r = rewrite(v);
      changed ||= r.changed;
      return r.value;
    });
    return { value: out, changed };
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = rewrite(v);
      changed ||= r.changed;
      out[k] = r.value;
    }
    return { value: out, changed };
  }
  return { value, changed: false };
}

export async function fixLocalFileUrls(): Promise<number> {
  if (env.PUBLIC_API_URL) return 0;
  const db = mongoose.connection.db;
  if (!db) return 0;
  let fixed = 0;
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    if (name.startsWith('system.') || /audit|token|session|log/i.test(name)) continue;
    const col = db.collection(name);
    const cursor = col.find({});
    for await (const doc of cursor) {
      const { _id, ...rest } = doc;
      const r = rewrite(rest);
      if (r.changed) {
        await col.replaceOne({ _id }, { ...(r.value as object) });
        fixed++;
      }
    }
  }
  if (fixed) logger.info(`Updated ${fixed} saved records to use relative /files/ image links`);
  return fixed;
}
