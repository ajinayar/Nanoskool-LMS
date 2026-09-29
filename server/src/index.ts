import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDb } from './db.js';
import { logger } from './lib/logger.js';
import { fixLocalFileUrls } from './lib/fixFileUrls.js';

async function main() {
  await connectDb();
  await fixLocalFileUrls().catch((err) => logger.warn(err, 'Could not update saved file links'));
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
