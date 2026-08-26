import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchService } from './search.service';

@ApiTags('admin/search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/search')
export class SearchAdminController {
  constructor(private readonly searchService: SearchService) {}

  /** One-off full reindex of every ACTIVE product into OpenSearch. A no-op
   * (returns { indexed: 0 }) when OpenSearch is disabled or unreachable —
   * never throws, matching SearchService's general contract. */
  @Post('reindex')
  async reindex() {
    const indexed = await this.searchService.reindexAll();
    return { indexed };
  }
}
