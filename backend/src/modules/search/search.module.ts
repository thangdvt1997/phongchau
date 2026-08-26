import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SearchAdminController } from './search-admin.controller';
import { SearchService } from './search.service';
import { OpenSearchClientProvider } from './opensearch-client.provider';

// Self-contained "side-effect module" in the same spirit as MarketingAutomationModule:
// CatalogModule imports this to get indexing hooks, but SearchModule never depends on
// CatalogModule — one-directional, no circular-import risk. PrismaModule is imported
// explicitly (not relied on as @Global()) since SearchService reads products directly
// to build/refresh search documents.
@Module({
  imports: [PrismaModule],
  controllers: [SearchAdminController],
  providers: [OpenSearchClientProvider, SearchService],
  exports: [SearchService],
})
export class SearchModule {}
