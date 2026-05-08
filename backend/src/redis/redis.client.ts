import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  tls: {}, // REQUIRED for Upstash
  connectTimeout: 10_000,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return times > 5 ? null : times * 500;
  },
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connecting...');
});

redis.on('ready', () => {
  console.log('Redis ready');
});
