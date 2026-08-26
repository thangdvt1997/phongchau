// TODO integration: main.ts's setGlobalPrefix exclude list needs 'sitemap.xml' and
// 'robots.txt' added so these serve from site root, not /api/v1/. Someone doing
// final integration must add these two strings to the exclude array in
// app.setGlobalPrefix('api/v1', { exclude: [...] }) in backend/src/main.ts.
// Until that lands, these two routes are reachable at /api/v1/sitemap.xml and
// /api/v1/robots.txt instead of the site root, which most crawlers/tools expect.
import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(@Res() res: Response) {
    const xml = await this.seoService.buildSitemapXml();
    res.type('application/xml').send(xml);
  }

  @Get('robots.txt')
  robots(@Res() res: Response) {
    const body = this.seoService.buildRobotsTxt();
    res.type('text/plain').send(body);
  }

  @Get('seo/json-ld/product/:slug')
  productJsonLd(@Param('slug') slug: string) {
    return this.seoService.buildProductJsonLd(slug);
  }

  @Get('seo/json-ld/organization')
  organizationJsonLd() {
    return this.seoService.buildOrganizationJsonLd();
  }
}
