import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDb } from './db.js';
import { logger } from './lib/logger.js';
import { fixLocalFileUrls } from './lib/fixFileUrls.js';
import { migrateGrades } from './lib/migrateGrades.js';
import { migrateHabits } from './lib/genius.js';
import { purgeOldPsychometric, seedPsychometric } from './lib/psychometric.js';
import { seedCognitive } from './lib/cognitive.js';
import { seedDoors } from './lib/doors.js';
import { withLock } from './lib/startupLock.js';

async function main() {
  await connectDb();
  // Start-up jobs run one process at a time, even if Nanoskool is started twice
  await withLock('startup', async () => {
    await fixLocalFileUrls().catch((err) => logger.warn(err, 'Could not update saved file links'));
    await migrateGrades().catch((err) => logger.warn(err, 'Could not move skills missions to single grades'));
    await migrateHabits().catch((err) => logger.warn(err, 'Could not add Genius Habit names'));
    await seedPsychometric().catch((err) => logger.warn(err, 'Could not add the psychometric profile'));
    await seedCognitive().catch((err) => logger.warn(err, 'Could not add the Thinking Puzzles'));
    await seedDoors().catch((err) => logger.warn(err, 'Could not add the doors'));
    await purgeOldPsychometric().catch((err) => logger.warn(err, 'Could not remove old psychometric data'));
  }).catch((err) => logger.warn(err, 'Start-up jobs did not finish'));
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info(`Nanoskool API listening on :${env.PORT}`));
  const shutdown = () => {
    logger.info('Shutting down');
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Failed to start');
  process.exit(1);
});
