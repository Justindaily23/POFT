import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConnectionOptions } from './redis-config.util';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const { url } = getRedisConnectionOptions(config);
        const client = new Redis(url, {
          connectTimeout: 10_000,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => (times > 5 ? null : times * 500),
        });

        client.on('ready', () => console.log('[Redis] ready'));
        client.on('error', (err) => console.error('[Redis] error:', err.message));

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
