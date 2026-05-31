import Redis from 'ioredis';
import { env } from '../config/env';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('connect', () => {
  console.log('[redis] Connected');
});

redis.on('ready', () => {
  console.log('[redis] Ready');
});

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err);
});

export default redis;