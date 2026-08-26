import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail, uniqueSuffix, API_PREFIX } from './utils/test-app';

const SEEDED_ADMIN_EMAIL = 'admin@phongchau.com';
const SEEDED_ADMIN_PASSWORD = 'Admin@12345';
const SEEDED_B2B_EMAIL = 'b2b@phongchau.com';
const SEEDED_B2B_PASSWORD = 'B2bCustomer@12345';
const SEEDED_CASHEW_SLUG = 'vietnam-roasted-cashew-w320';

describe('B2B (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new B2B company, admin approves it, and the new user sees APPROVED', async () => {
    const suffix = uniqueSuffix();
    const email = uniqueEmail('b2b-register');

    // 1. POST /auth/register/b2b -> 201 (Nest default POST status), returns accessToken + PENDING company.
    const registerRes = await request(server)
      .post(`${API_PREFIX}/auth/register/b2b`)
      .send({
        email,
        password: 'SuperSecret1!',
        contactPerson: 'E2E B2B Contact',
        phone: '0911111111',
        companyName: `E2E Test Trading Co ${suffix}`,
        taxId: `TAX-${suffix}`,
        country: 'Vietnam',
        businessType: 'DISTRIBUTOR',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty('accessToken');
    expect(registerRes.body.user.role).toBe('B2B_CUSTOMER');
    expect(registerRes.body.user.companyId).toBeTruthy();
    const b2bAccessToken = registerRes.body.accessToken;
    const companyId = registerRes.body.user.companyId;

    // 2. Log in as admin.
    const adminLogin = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_ADMIN_EMAIL,
      password: SEEDED_ADMIN_PASSWORD,
    });
    expect(adminLogin.status).toBe(201);
    const adminToken = adminLogin.body.accessToken;

    // 3. GET /admin/b2b/companies?status=PENDING -> 200, find the newly created company.
    const listRes = await request(server)
      .get(`${API_PREFIX}/admin/b2b/companies`)
      .query({ status: 'PENDING' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    const found = listRes.body.items.find((c: any) => c.id === companyId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');

    // 4. POST /admin/b2b/companies/:id/approve -> 201 (Nest default POST status), status APPROVED.
    const approveRes = await request(server)
      .post(`${API_PREFIX}/admin/b2b/companies/${companyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(201);
    expect(approveRes.body.status).toBe('APPROVED');
    expect(approveRes.body.id).toBe(companyId);

    // 5. As the new B2B user, GET /b2b/company/me -> 200, status APPROVED.
    const meRes = await request(server)
      .get(`${API_PREFIX}/b2b/company/me`)
      .set('Authorization', `Bearer ${b2bAccessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.status).toBe('APPROVED');
    expect(meRes.body.id).toBe(companyId);
  });

  it('seeded pre-approved B2B customer gets CUSTOMER_PRICE on the cashew product with the overridden unit price', async () => {
    // Log in as the seeded, already-approved B2B user.
    const login = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_B2B_EMAIL,
      password: SEEDED_B2B_PASSWORD,
    });
    expect(login.status).toBe(201);
    expect(login.body.user.role).toBe('B2B_CUSTOMER');
    const token = login.body.accessToken;

    const productRes = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_CASHEW_SLUG}`);
    expect(productRes.status).toBe(200);
    const variant = productRes.body.variants[0];

    // Authenticated cart call needs no x-cart-session header.
    const addRes = await request(server)
      .post(`${API_PREFIX}/cart/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: variant.id, quantity: 2 });

    expect(addRes.status).toBe(201);
    const item = addRes.body.items.find((i: any) => i.productVariantId === variant.id);
    expect(item).toBeDefined();
    expect(item.priceSource).toBe('CUSTOMER_PRICE');
    // Per seed.ts: CustomerPrice for ABC Global Import Co. on vietnam-roasted-cashew-w320 is 100000.
    // Quantity isn't asserted as exactly 2: this is the seeded user's persistent cart, and
    // addItem() increments existing quantity on repeat runs rather than resetting it, so only
    // unitPrice/priceSource (and internal consistency of lineTotal) are safe to assert exactly.
    expect(item.unitPrice).toBe(100000);
    expect(item.lineTotal).toBe(item.unitPrice * item.quantity);
    expect(item.quantity).toBeGreaterThanOrEqual(2);
  });
});
