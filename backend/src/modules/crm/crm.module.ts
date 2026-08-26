import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmAdminController } from './crm-admin.controller';
import { CrmService } from './crm.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [CrmController, CrmAdminController],
  providers: [CrmService, RolesGuard],
})
export class CrmModule {}
