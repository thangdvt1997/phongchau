import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail, API_PREFIX } from './utils/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: any;

  const SEEDED_CUSTOMER_EMAIL = 'customer@phongchau.com';
  const SEEDED_CUSTOMER_PASSWORD = 'Customer@12345';

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new retail user -> 201 with tokens and user', async () => {
    const email = uniqueEmail('auth-register');
    const res = await request(server)
      .post(`${API_PREFIX}/auth/register`)
      .send({
        email,
        password: 'SuperSecret1!',
        fullName: 'E2E Test User',
        phone: '0900000000',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('RETAIL_CUSTOMER');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects login with wrong password -> 401', async () => {
    const res = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: 'wrong-password-123',
    });

    expect(res.status).toBe(401);
  });

  it('logs in with correct seeded credentials -> 201 (Nest default POST status; no @HttpCode override in auth.controller.ts)', async () => {
    const res = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: SEEDED_CUSTOMER_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(SEEDED_CUSTOMER_EMAIL);
    expect(res.body.user.role).toBe('RETAIL_CUSTOMER');
  });

  it('GET /auth/me with bearer token -> 200 matching logged-in user', async () => {
    const login = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: SEEDED_CUSTOMER_PASSWORD,
    });
    const accessToken = login.body.accessToken;

    const res = await request(server)
      .get(`${API_PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(SEEDED_CUSTOMER_EMAIL);
    expect(res.body.role).toBe('RETAIL_CUSTOMER');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('GET /auth/me with no token -> 401', async () => {
    const res = await request(server).get(`${API_PREFIX}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh with the refresh token -> 201 (Nest default POST status) with new tokens', async () => {
    const login = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: SEEDED_CUSTOMER_PASSWORD,
    });
    const { refreshToken } = login.body;

    const res = await request(server)
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(typeof res.body.accessToken).toBe('string');
  });
});
