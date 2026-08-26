import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, API_PREFIX } from './utils/test-app';

describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let server: any;

  const SEEDED_SLUG = 'vietnam-roasted-cashew-w320';
  const SEEDED_BATCH_NUMBER = 'LOT-2026-CASHEW-W320';

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /catalog/products -> 200 with a non-empty items array', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/products`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(typeof item.slug).toBe('string');
      expect(typeof item.basePrice).toBe('number');
      expect(typeof item.currency).toBe('string');
    }
  });

  it('GET /catalog/products?categorySlug=cashew -> 200, all items in Cashew category', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/products`).query({ categorySlug: 'cashew' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item.category).toBe('Cashew');
    }
  });

  it('GET /catalog/products/:slug -> 200 with variants and numeric availableStock', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_SLUG}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(SEEDED_SLUG);
    expect(Array.isArray(res.body.variants)).toBe(true);
    expect(res.body.variants.length).toBeGreaterThan(0);
    for (const variant of res.body.variants) {
      expect(typeof variant.availableStock).toBe('number');
      expect(typeof variant.price).toBe('number');
    }
  });

  it('GET /catalog/products/:slug for an unknown slug -> 404', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/products/this-slug-does-not-exist`);
    expect(res.status).toBe(404);
  });

  it('GET /catalog/categories -> 200 array', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/categories`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('slug');
    expect(res.body[0]).toHaveProperty('children');
  });

  it('GET /catalog/traceability/:batchNumber -> 200 for a seeded batch', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/traceability/${SEEDED_BATCH_NUMBER}`);

    expect(res.status).toBe(200);
    expect(res.body.batchNumber).toBe(SEEDED_BATCH_NUMBER);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.slug).toBe(SEEDED_SLUG);
  });

  it('GET /catalog/traceability/:batchNumber for unknown batch -> 404', async () => {
    const res = await request(server).get(`${API_PREFIX}/catalog/traceability/LOT-DOES-NOT-EXIST`);
    expect(res.status).toBe(404);
  });
});
