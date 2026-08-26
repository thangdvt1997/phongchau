import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, API_PREFIX } from './utils/test-app';

const SEEDED_BLOG_SLUG = 'vietnam-cashew-export-guide-2026';

describe('CMS + SEO (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cms/blogs -> 200, non-empty, list items omit the full content field', async () => {
    const res = await request(server).get(`${API_PREFIX}/cms/blogs`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
    for (const item of res.body.items) {
      expect(item).not.toHaveProperty('content');
      expect(typeof item.title).toBe('string');
      expect(typeof item.slug).toBe('string');
    }
  });

  it('GET /cms/blogs/:slug -> 200 with full content for a seeded post', async () => {
    const res = await request(server).get(`${API_PREFIX}/cms/blogs/${SEEDED_BLOG_SLUG}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(SEEDED_BLOG_SLUG);
    expect(typeof res.body.content).toBe('string');
    expect(res.body.content.length).toBeGreaterThan(0);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('GET /cms/blogs/:slug for unknown slug -> 404', async () => {
    const res = await request(server).get(`${API_PREFIX}/cms/blogs/does-not-exist-slug`);
    expect(res.status).toBe(404);
  });

  it('GET /sitemap.xml -> 200, served at the true root (excluded from the api/v1 prefix)', async () => {
    const res = await request(server).get('/sitemap.xml');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('xml');
    expect(res.text).toContain('<urlset');
  });

  it('GET /robots.txt -> 200, served at the true root, references the sitemap', async () => {
    const res = await request(server).get('/robots.txt');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('Sitemap:');
  });
});
