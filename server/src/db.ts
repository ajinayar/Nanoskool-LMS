import mongoose from 'mongoose';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

export async function connectDb(uri = env.MONGO_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('Connected to MongoDB');
}
