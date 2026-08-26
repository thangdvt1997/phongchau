import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly productsService: ProductsService,
  ) {}

  @Get('categories')
  getCategories() {
    return this.catalogService.getCategoryTree();
  }

  @Get('brands')
  getBrands() {
    return this.catalogService.listBrands();
  }

  @Get('origins')
  getOrigins() {
    return this.catalogService.listOrigins();
  }

  @Get('certifications')
  getCertifications() {
    return this.catalogService.listCertifications();
  }

  @Get('products')
  getProducts(@Query() query: ProductQueryDto) {
    return this.productsService.listPublic(query);
  }

  // Public QR-code traceability lookup (spec section 17/22) — distinct top-level
  // path segment from 'products/:slug', so there's no route-ordering ambiguity.
  @Get('traceability/:batchNumber')
  getTraceability(@Param('batchNumber') batchNumber: string) {
    return this.productsService.getBatchByNumber(batchNumber);
  }

  @Get('products/:slug')
  getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.getPublicBySlug(slug);
  }
}
