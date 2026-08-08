import { ConfigService } from '@nestjs/config';

export function getRedisConnectionOptions(config: ConfigService) {
  const redisUrl = config.get<string>('REDIS_URL');
  if (!redisUrl) {
    throw new Error('REDIS_URL is not set');
  }

  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === 'rediss:';

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    tls: isTls ? {} : undefined,
    url: redisUrl,
  };
}
