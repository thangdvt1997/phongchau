import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { CatalogController } from './catalog.controller';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogService } from './catalog.service';
import { ProductsService } from './products.service';

// NOTE: CommonModule is imported explicitly (not relied upon as @Global())
// because ProductsService injects STORAGE_SERVICE for image/document uploads
// — importing here guarantees resolution regardless of CommonModule's own
// @Global() status.
@Module({
  imports: [CommonModule],
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogService, ProductsService],
  exports: [ProductsService, CatalogService],
})
export class CatalogModule {}
