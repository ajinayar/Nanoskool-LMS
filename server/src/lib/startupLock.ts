/**
 * A simple lock in the database so start-up jobs (migrations, seeding) never run twice at the same time —
 * e.g. when Nanoskool is started twice, or the file watcher restarts the server mid-way.
 */
import mongoose from 'mongoose';

const STALE_MS = 10 * 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs fn while holding the named lock. If another process holds it, waits for it to finish and skips fn. */
export async function withLock<T>(name: string, fn: () => Promise<T>, waitMs = 120_000): Promise<T | undefined> {
  const locks = mongoose.connection.collection<{ _id: string; at: Date; pid: number }>('locks');
  const started = Date.now();
  for (;;) {
    try {
      await locks.insertOne({ _id: name, at: new Date(), pid: process.pid });
      break;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      const cur = await locks.findOne({ _id: name });
      if (cur && Date.now() - new Date(cur.at).getTime() > STALE_MS) {
        await locks.deleteOne({ _id: name, at: cur.at });
        continue;
      }
      // Someone else is doing the job: wait until they finish, then skip it
      while (Date.now() - started < waitMs && (await locks.findOne({ _id: name }))) await sleep(500);
      return undefined;
    }
  }
  try {
    return await fn();
  } finally {
    await locks.deleteOne({ _id: name, pid: process.pid });
  }
}
