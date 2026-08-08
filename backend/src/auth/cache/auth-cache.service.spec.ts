import { AuthCacheService } from './auth-cache.service';

describe('AuthCacheService', () => {
  it('stores and retrieves auth context payloads', async () => {
    const redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const service = new AuthCacheService(redis as any);
    const payload = {
      id: 'user-1',
      role: 'USER',
      email: 'user@example.com',
      name: 'User One',
      tokenVersion: 2,
      mustChangePassword: false,
      isActive: true,
    };

    await service.setAuthContext('user-1', payload, 60);

    expect(redis.set).toHaveBeenCalledWith('auth:user:user-1', JSON.stringify(payload), 'EX', 60);

    redis.get.mockResolvedValueOnce(JSON.stringify(payload));
    await expect(service.getAuthContext('user-1')).resolves.toEqual(payload);
  });
});
