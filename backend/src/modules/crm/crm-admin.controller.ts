import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LeadStatus, Role } from '@prisma/client';

@ApiTags('admin/crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MARKETING_SEO)
@Controller('admin/leads')
export class CrmAdminController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  list(
    @Query('status') status?: LeadStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.crmService.list(status, Number(page) || 1, Number(pageSize) || 20);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body('status') status: LeadStatus,
    @Body('assigneeId') assigneeId?: string,
  ) {
    return this.crmService.updateStatus(id, status, assigneeId);
  }
}
