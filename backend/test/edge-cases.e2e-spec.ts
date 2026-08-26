import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueSuffix, API_PREFIX } from './utils/test-app';

const SEEDED_ADMIN_EMAIL = 'admin@phongchau.com';
const SEEDED_ADMIN_PASSWORD = 'Admin@12345';
const SEEDED_CUSTOMER_EMAIL = 'customer@phongchau.com';
const SEEDED_CUSTOMER_PASSWORD = 'Customer@12345';
const SEEDED_CASHEW_SLUG = 'vietnam-roasted-cashew-w320';
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Targeted hardening regression tests: every case here reproduces a bug found by
 * probing the live deployment with bad/edge-case input (see the P0 hardening pass
 * report) that used to return a raw 500 instead of a clean 4xx.
 */
describe('Edge cases / error-handling hardening (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let customerToken: string;
  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const adminLogin = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_ADMIN_EMAIL,
      password: SEEDED_ADMIN_PASSWORD,
    });
    adminToken = adminLogin.body.accessToken;

    const customerLogin = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: SEEDED_CUSTOMER_PASSWORD,
    });
    customerToken = customerLogin.body.accessToken;

    const productRes = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_CASHEW_SLUG}`);
    productId = productRes.body.id;
    categoryId = productRes.body.categoryId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('pagination query validation (previously: negative page -> raw 500)', () => {
    it('GET /admin/customers?page=-1 -> 400', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/admin/customers`)
        .query({ page: -1 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('GET /admin/audit-logs?page=-1 -> 400', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/admin/audit-logs`)
        .query({ page: -1 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('GET /orders?page=-1 -> 400', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/orders`)
        .query({ page: -1 })
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(400);
    });

    it('GET /admin/orders?page=-1 -> 400', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/admin/orders`)
        .query({ page: -1 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('GET /admin/leads?page=-1 -> 400', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/admin/leads`)
        .query({ page: -1 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('GET /admin/customers?pageSize=100000 -> 400 (clamped to a max of 100)', async () => {
      const res = await request(server)
        .get(`${API_PREFIX}/admin/customers`)
        .query({ pageSize: 100000 })
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /admin/leads/:id with an invalid status enum (previously: raw 500)', () => {
    it('rejects an unknown LeadStatus value with 400', async () => {
      const contactRes = await request(server).post(`${API_PREFIX}/contact`).send({
        fullName: 'Edge Case Tester',
        email: 'edge-case-lead@example.com',
        message: 'Testing invalid status update',
      });
      expect(contactRes.status).toBe(201);
      const leadId = contactRes.body.id;

      const res = await request(server)
        .patch(`${API_PREFIX}/admin/leads/${leadId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'NOT_A_REAL_STATUS' });
      expect(res.status).toBe(400);
    });
  });

  describe('RFQ creation with a nonexistent productId (previously: raw 500)', () => {
    it('POST /rfq with an unknown productId -> 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/rfq`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: NON_EXISTENT_UUID, quantity: 10, unit: 'kg' }] });
      expect(res.status).toBe(400);
    });
  });

  describe('B2B pricing admin FK validation (previously: raw 500)', () => {
    it('POST /admin/b2b/products/:productId/price-tiers with an unknown productId -> 400/404', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/b2b/products/${NON_EXISTENT_UUID}/price-tiers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ minQty: 1, price: 1000, currency: 'VND' });
      expect([400, 404]).toContain(res.status);
    });

    it('POST /admin/b2b/companies/:companyId/customer-prices with an unknown companyId -> 400/404', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/b2b/companies/${NON_EXISTENT_UUID}/customer-prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId, price: 1000, currency: 'VND' });
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('Inventory adjust FK validation (previously: raw 500)', () => {
    it('POST /admin/inventory/adjust with an unknown productVariantId/warehouseId -> 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/inventory/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productVariantId: NON_EXISTENT_UUID,
          warehouseId: NON_EXISTENT_UUID,
          quantity: 10,
          type: 'IN',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Shipment creation FK validation (previously: raw 500)', () => {
    it('POST /admin/shipments with an unknown orderId -> 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/shipments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orderId: NON_EXISTENT_UUID, method: 'FLAT_RATE', cost: 50000 });
      expect(res.status).toBe(400);
    });
  });

  describe('Category creation FK validation (previously: raw 500)', () => {
    it('POST /admin/catalog/categories with an unknown parentId -> 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/catalog/categories`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Edge Case Category ${uniqueSuffix()}`, parentId: NON_EXISTENT_UUID });
      expect(res.status).toBe(400);
    });
  });

  describe('Product price validation (previously: negative/zero prices silently accepted)', () => {
    it('POST /admin/catalog/products with a negative basePrice -> 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/catalog/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: `EDGE-NEG-${uniqueSuffix()}`,
          name: 'Negative Price Edge Case',
          categoryId,
          basePrice: -500,
        });
      expect(res.status).toBe(400);
    });

    it('POST /admin/catalog/products with a negative variant price -> 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/catalog/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: `EDGE-NEGVAR-${uniqueSuffix()}`,
          name: 'Negative Variant Price Edge Case',
          categoryId,
          basePrice: 1000,
          variants: [{ sku: `EDGE-NEGVAR-${uniqueSuffix()}-V1`, price: -1 }],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('Product image upload validation (previously: any mimetype/size accepted)', () => {
    it('rejects a disallowed mimetype (e.g. an .exe) with 400', async () => {
      const res = await request(server)
        .post(`${API_PREFIX}/admin/catalog/products/${productId}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('not really an image'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload',
        });
      expect(res.status).toBe(400);
    });

    it('accepts a real image mimetype', async () => {
      // Minimal valid 1x1 PNG.
      const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );
      const res = await request(server)
        .post(`${API_PREFIX}/admin/catalog/products/${productId}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', png, { filename: 'ok.png', contentType: 'image/png' });
      expect(res.status).toBe(201);

      // Clean up the uploaded image so this test doesn't leave extra rows on the seeded product.
      await request(server)
        .delete(`${API_PREFIX}/admin/catalog/products/${productId}/images/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  describe('Checkout with a disabled payment provider (previously: clean 400, but an orphaned order was still created)', () => {
    it('rejects VNPAY (disabled in this environment) before any order is created', async () => {
      const initialCart = await request(server).get(`${API_PREFIX}/cart`);
      const sessionId = initialCart.headers['x-cart-session'];
      const productRes = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_CASHEW_SLUG}`);
      const variantId = productRes.body.variants[0].id;

      await request(server)
        .post(`${API_PREFIX}/cart/items`)
        .set('x-cart-session', sessionId)
        .send({ productVariantId: variantId, quantity: 1 });

      const checkoutRes = await request(server)
        .post(`${API_PREFIX}/checkout`)
        .set('x-cart-session', sessionId)
        .send({
          guestEmail: 'edge-case-disabled-provider@example.com',
          shippingAddress: {
            fullName: 'Edge Case',
            phone: '0900000000',
            line1: '1 Test Street',
            city: 'Ho Chi Minh City',
            country: 'Vietnam',
          },
          paymentProvider: 'VNPAY',
        });
      expect(checkoutRes.status).toBe(400);

      // The cart must still hold the item — checkout must have failed before ever touching it.
      const cartAfter = await request(server).get(`${API_PREFIX}/cart`).set('x-cart-session', sessionId);
      expect(cartAfter.body.items).toHaveLength(1);
    });
  });
});
