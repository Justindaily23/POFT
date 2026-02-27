import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export async function loginAsAdmin(app: INestApplication, email: string, password: string, deviceId = 'jest-device') {
  const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password, deviceId });

  const cookies = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [];

  const refreshTokenCookie = cookies.find((c) => c.includes('refreshToken')) || '';

  return {
    accessToken: res.body.accessToken,
    mustChangePassword: res.body.mustChangePassword,
    refreshTokenCookie,
  };
}
