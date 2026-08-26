import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductStatus, ContentStatus } from '@prisma/client';

interface SitemapUrl {
  loc: string;
  lastmod: Date;
}

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl(): string {
    return (this.config.get<string>('publicBaseUrl') ?? '').replace(/\/+$/, '');
  }

  async buildSitemapXml(): Promise<string> {
    const [categories, products, blogs] = await Promise.all([
      this.prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.blog.findMany({
        where: { status: ContentStatus.PUBLISHED },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const urls: SitemapUrl[] = [
      ...categories.map((c) => ({
        loc: `${this.baseUrl}/products/category/${c.slug}`,
        lastmod: c.updatedAt,
      })),
      ...products.map((p) => ({
        loc: `${this.baseUrl}/products/${p.slug}`,
        lastmod: p.updatedAt,
      })),
      ...blogs.map((b) => ({
        loc: `${this.baseUrl}/blog/${b.slug}`,
        lastmod: b.updatedAt,
      })),
    ];

    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${this.escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod.toISOString()}</lastmod>\n  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }

  buildRobotsTxt(): string {
    const sitemapUrl = `${this.baseUrl}/sitemap.xml`;
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/v1/admin',
      'Disallow: /checkout',
      'Disallow: /account',
      '',
      `Sitemap: ${sitemapUrl}`,
      '',
    ].join('\n');
  }

  async buildProductJsonLd(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        brand: true,
        images: { orderBy: { position: 'asc' } },
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription ?? product.fullDescription ?? undefined,
      sku: product.sku,
      image: product.images.map((img) => img.url),
      brand: product.brand
        ? { '@type': 'Brand', name: product.brand.name }
        : undefined,
      offers: {
        '@type': 'Offer',
        price: product.basePrice.toString(),
        priceCurrency: product.currency,
        availability:
          product.status === ProductStatus.ACTIVE
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    };
  }

  buildOrganizationJsonLd() {
    // TODO: these are hardcoded placeholders for the P0 launch. Move to an
    // admin-configurable "site settings" model in a later pass instead of
    // hardcoding brand identity here.
    const url = this.baseUrl;
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Phong Chau',
      url,
      logo: `${url}/logo.png`,
    };
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
