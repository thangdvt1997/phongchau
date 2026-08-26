import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { MarketingAutomationModule } from '../marketing/marketing.module';
import { SearchModule } from '../search/search.module';
import { CatalogController } from './catalog.controller';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogService } from './catalog.service';
import { ProductsService } from './products.service';
import { ProductImportService } from './product-import.service';

// NOTE: CommonModule is imported explicitly (not relied upon as @Global())
// because ProductsService injects STORAGE_SERVICE for image/document uploads
// — importing here guarantees resolution regardless of CommonModule's own
// @Global() status. MarketingAutomationModule is imported for the price-drop
// hook in ProductsService.update() — one-directional (Marketing doesn't
// depend on Catalog), so no circular-import risk. SearchModule is imported for
// the OpenSearch indexing hooks in ProductsService.create()/update()/remove()
// and the search-backed read path in listPublic() — same one-directional
// relationship (Search doesn't depend on Catalog).
@Module({
  imports: [CommonModule, MarketingAutomationModule, SearchModule],
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogService, ProductsService, ProductImportService],
  exports: [ProductsService, CatalogService],
})
export class CatalogModule {}
