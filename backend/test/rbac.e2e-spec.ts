import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, API_PREFIX } from './utils/test-app';

const SEEDED_CUSTOMER_EMAIL = 'customer@phongchau.com';
const SEEDED_CUSTOMER_PASSWORD = 'Customer@12345';
const SEEDED_ADMIN_EMAIL = 'admin@phongchau.com';
const SEEDED_ADMIN_PASSWORD = 'Admin@12345';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const customerLogin = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: SEEDED_CUSTOMER_PASSWORD,
    });
    customerToken = customerLogin.body.accessToken;

    const adminLogin = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_ADMIN_EMAIL,
      password: SEEDED_ADMIN_PASSWORD,
    });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /admin/dashboard/overview as a retail customer -> 403', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/admin/dashboard/overview`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /admin/catalog/products as a retail customer -> 403', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/admin/catalog/products`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /admin/dashboard/overview with no token at all -> 401', async () => {
    const res = await request(server).get(`${API_PREFIX}/admin/dashboard/overview`);
    expect(res.status).toBe(401);
  });

  it('GET /admin/catalog/products with no token at all -> 401', async () => {
    const res = await request(server).get(`${API_PREFIX}/admin/catalog/products`);
    expect(res.status).toBe(401);
  });

  it('GET /admin/dashboard/overview as admin -> 200', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/admin/dashboard/overview`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('GET /admin/catalog/products as admin -> 200', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/admin/catalog/products`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
