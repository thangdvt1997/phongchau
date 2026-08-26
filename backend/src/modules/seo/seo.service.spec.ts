import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeoService } from './seo.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

describe('SeoService', () => {
  let service: SeoService;
  let prisma: any;
  let config: ConfigService;

  beforeEach(() => {
    prisma = {
      category: { findMany: jest.fn() },
      product: { findMany: jest.fn(), findUnique: jest.fn() },
      blog: { findMany: jest.fn() },
    };
    config = { get: () => 'http://example.test' } as unknown as ConfigService;
    service = new SeoService(prisma as unknown as PrismaService, config);
  });

  describe('buildSitemapXml', () => {
    it('aggregates categories, active products, and published blogs into <url> entries', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      prisma.category.findMany.mockResolvedValue([{ slug: 'rice', updatedAt: now }]);
      prisma.product.findMany.mockResolvedValue([{ slug: 'jasmine-rice', updatedAt: now }]);
      prisma.blog.findMany.mockResolvedValue([{ slug: 'how-rice-is-grown', updatedAt: now }]);

      const xml = await service.buildSitemapXml();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('http://example.test/products/category/rice');
      expect(xml).toContain('http://example.test/products/jasmine-rice');
      expect(xml).toContain('http://example.test/blog/how-rice-is-grown');
      expect(xml).toContain(now.toISOString());
    });

    it('only queries ACTIVE products and PUBLISHED blogs', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.blog.findMany.mockResolvedValue([]);

      await service.buildSitemapXml();

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: ProductStatus.ACTIVE } }),
      );
    });
  });

  describe('buildRobotsTxt', () => {
    it('disallows admin/checkout/account and points Sitemap at the absolute URL', () => {
      const body = service.buildRobotsTxt();
      expect(body).toContain('Disallow: /admin');
      expect(body).toContain('Disallow: /api/v1/admin');
      expect(body).toContain('Disallow: /checkout');
      expect(body).toContain('Disallow: /account');
      expect(body).toContain('Sitemap: http://example.test/sitemap.xml');
    });
  });

  describe('buildProductJsonLd', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.buildProductJsonLd('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('shapes a schema.org Product with offers and brand', async () => {
      prisma.product.findUnique.mockResolvedValue({
        name: 'Jasmine Rice',
        shortDescription: 'Premium jasmine rice',
        fullDescription: null,
        sku: 'SKU-1',
        basePrice: { toString: () => '120000' },
        currency: 'VND',
        status: ProductStatus.ACTIVE,
        brand: { name: 'Phong Chau Farms' },
        images: [{ url: 'http://img/1.jpg' }, { url: 'http://img/2.jpg' }],
      });

      const result = await service.buildProductJsonLd('jasmine-rice');

      expect(result).toMatchObject({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Jasmine Rice',
        sku: 'SKU-1',
        image: ['http://img/1.jpg', 'http://img/2.jpg'],
        brand: { '@type': 'Brand', name: 'Phong Chau Farms' },
        offers: {
          '@type': 'Offer',
          price: '120000',
          priceCurrency: 'VND',
          availability: 'https://schema.org/InStock',
        },
      });
    });
  });

  describe('buildOrganizationJsonLd', () => {
    it('returns a schema.org Organization with the configured base URL', () => {
      const result = service.buildOrganizationJsonLd();
      expect(result).toEqual({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Phong Chau',
        url: 'http://example.test',
        logo: 'http://example.test/logo.png',
      });
    });
  });
});
