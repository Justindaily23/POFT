import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

export interface AuthCachePayload {
  id: string;
  role: string;
  email: string;
  name: string;
  tokenVersion: number;
  mustChangePassword: boolean;
  isActive: boolean;
}

@Injectable()
export class AuthCacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private getKey(userId: string) {
    return `auth:user:${userId}`;
  }

  async getAuthContext(userId: string): Promise<AuthCachePayload | null> {
    try {
      const cached = await this.redis.get(this.getKey(userId));
      if (!cached) return null;

      try {
        return JSON.parse(cached) as AuthCachePayload;
      } catch {
        await this.redis.del(this.getKey(userId)).catch(() => undefined);
        return null;
      }
    } catch {
      return null;
    }
  }

  async setAuthContext(userId: string, payload: AuthCachePayload, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(this.getKey(userId), JSON.stringify(payload), 'EX', ttlSeconds);
    } catch {
      // Fail closed for cache writes; auth should still work without Redis.
    }
  }

  async invalidateAuthContext(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(userId));
    } catch {
      // Ignore cache invalidation failures.
    }
  }

  async invalidateAuthContexts(userIds: string[]): Promise<void> {
    if (!userIds.length) return;
    await Promise.all(userIds.map((userId) => this.invalidateAuthContext(userId)));
  }
}
