import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, API_PREFIX } from './utils/test-app';

const SEEDED_CUSTOMER_EMAIL = 'customer@phongchau.com';
const SEEDED_CUSTOMER_PASSWORD = 'Customer@12345';
const SEEDED_PRODUCT_SLUG = 'vietnam-roasted-cashew-w320';

describe('Engagement: wishlist + reviews (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let customerToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const login = await request(server).post(`${API_PREFIX}/auth/login`).send({
      email: SEEDED_CUSTOMER_EMAIL,
      password: SEEDED_CUSTOMER_PASSWORD,
    });
    customerToken = login.body.accessToken;

    const productRes = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_PRODUCT_SLUG}`);
    productId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('wishlist: add -> appears in list -> remove', async () => {
    // POST /wishlist -> 201 (Nest default POST status), returns the wishlist row (upserted).
    const addRes = await request(server)
      .post(`${API_PREFIX}/wishlist`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId });

    expect(addRes.status).toBe(201);
    expect(addRes.body.productId).toBe(productId);

    // GET /wishlist -> 200, includes the product we just added.
    const listRes = await request(server)
      .get(`${API_PREFIX}/wishlist`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.find((w: any) => w.productId === productId);
    expect(found).toBeDefined();
    expect(found.product.slug).toBe(SEEDED_PRODUCT_SLUG);
    expect(typeof found.product.basePrice).toBe('number');

    // DELETE /wishlist/:productId -> 200 { success: true }.
    const removeRes = await request(server)
      .delete(`${API_PREFIX}/wishlist/${productId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.success).toBe(true);

    const listAfterRemove = await request(server)
      .get(`${API_PREFIX}/wishlist`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(listAfterRemove.status).toBe(200);
    expect(listAfterRemove.body.find((w: any) => w.productId === productId)).toBeUndefined();
  });

  it('reviews: a newly created review is PENDING and hidden from the public list', async () => {
    // POST /products/:productId/reviews -> 201, status PENDING.
    const createRes = await request(server)
      .post(`${API_PREFIX}/products/${productId}/reviews`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'Excellent quality cashews, will order again.' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('PENDING');
    expect(createRes.body.rating).toBe(5);
    const reviewId = createRes.body.id;

    // GET /products/:productId/reviews (public, no auth) -> 200, does not include the PENDING review.
    const listRes = await request(server).get(`${API_PREFIX}/products/${productId}/reviews`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.items)).toBe(true);
    expect(listRes.body.items.find((r: any) => r.id === reviewId)).toBeUndefined();
    for (const review of listRes.body.items) {
      expect(review.status).toBe('APPROVED');
    }
    expect(listRes.body).toHaveProperty('averageRating');
  });

  it('rejects review creation with an invalid rating -> 400', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/products/${productId}/reviews`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 7 });

    expect(res.status).toBe(400);
  });

  it('rejects review creation with no auth token -> 401', async () => {
    const res = await request(server)
      .post(`${API_PREFIX}/products/${productId}/reviews`)
      .send({ rating: 5 });

    expect(res.status).toBe(401);
  });
});
