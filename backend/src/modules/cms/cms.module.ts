import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller';
import { CmsAdminController } from './cms-admin.controller';
import { CmsService } from './cms.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [CmsController, CmsAdminController],
  providers: [CmsService, RolesGuard],
  exports: [CmsService],
})
export class CmsModule {}
