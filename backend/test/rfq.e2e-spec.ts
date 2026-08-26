import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, API_PREFIX } from './utils/test-app';

const SEEDED_CUSTOMER_EMAIL = 'customer@phongchau.com';
const SEEDED_CUSTOMER_PASSWORD = 'Customer@12345';
const SEEDED_ADMIN_EMAIL = 'admin@phongchau.com';
const SEEDED_ADMIN_PASSWORD = 'Admin@12345';
const SEEDED_PRODUCT_SLUG = 'vietnam-roasted-cashew-w320';

describe('RFQ (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let customerToken: string;
  let adminToken: string;
  let productId: string;

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

    const productRes = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_PRODUCT_SLUG}`);
    productId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('full RFQ lifecycle: create -> submit -> double-submit rejected -> SALES_REVIEW -> quotation -> accept', async () => {
    // 1. POST /rfq as the retail customer -> 201 (Nest default POST status), status DRAFT.
    const createRes = await request(server)
      .post(`${API_PREFIX}/rfq`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 500, unit: 'kg', specification: 'Grade W320' }],
        destinationCountry: 'United States',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('DRAFT');
    expect(createRes.body.items).toHaveLength(1);
    expect(createRes.body.items[0].productId).toBe(productId);
    const rfqId = createRes.body.id;

    // 2. POST /rfq/:id/submit -> 201, status SUBMITTED.
    const submitRes = await request(server)
      .post(`${API_PREFIX}/rfq/${rfqId}/submit`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.status).toBe('SUBMITTED');

    // 3. Submitting again -> 400 (no longer DRAFT).
    const doubleSubmitRes = await request(server)
      .post(`${API_PREFIX}/rfq/${rfqId}/submit`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(doubleSubmitRes.status).toBe(400);

    // 4. Admin: PATCH /admin/rfq/:id/status -> SALES_REVIEW -> 200.
    const salesReviewRes = await request(server)
      .patch(`${API_PREFIX}/admin/rfq/${rfqId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SALES_REVIEW' });

    expect(salesReviewRes.status).toBe(200);
    expect(salesReviewRes.body.status).toBe('SALES_REVIEW');

    // 5. Admin: POST /admin/rfq/:id/quotations -> 201; response is the created Quotation
    // (not the RFQ), so the RFQ's new QUOTATION_SENT status is verified via a follow-up GET.
    const quotationRes = await request(server)
      .post(`${API_PREFIX}/admin/rfq/${rfqId}/quotations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        currency: 'VND',
        items: [{ productId, quantity: 500, unitPrice: 200000, leadTime: '15 days' }],
      });

    expect(quotationRes.status).toBe(201);
    expect(quotationRes.body.status).toBe('SENT');
    expect(quotationRes.body.rfqId).toBe(rfqId);
    expect(quotationRes.body.totalAmount).toBe(500 * 200000);
    const quotationId = quotationRes.body.id;

    const rfqAfterQuotationRes = await request(server)
      .get(`${API_PREFIX}/rfq/${rfqId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(rfqAfterQuotationRes.status).toBe(200);
    expect(rfqAfterQuotationRes.body.status).toBe('QUOTATION_SENT');
    expect(rfqAfterQuotationRes.body.quotations).toHaveLength(1);

    // 6. Customer: POST /rfq/:id/quotations/:quotationId/accept -> 201, status ACCEPTED.
    const acceptRes = await request(server)
      .post(`${API_PREFIX}/rfq/${rfqId}/quotations/${quotationId}/accept`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.status).toBe('ACCEPTED');
  });

  it('rejects an illegal transition straight from DRAFT to COMPLETED -> 400', async () => {
    const createRes = await request(server)
      .post(`${API_PREFIX}/rfq`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId, quantity: 100, unit: 'kg' }],
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('DRAFT');
    const rfqId = createRes.body.id;

    const badTransitionRes = await request(server)
      .patch(`${API_PREFIX}/admin/rfq/${rfqId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });

    expect(badTransitionRes.status).toBe(400);
  });
});
