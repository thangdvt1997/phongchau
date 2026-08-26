import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '@prisma/client';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AddLeadActivityDto } from './dto/add-lead-activity.dto';

@ApiTags('admin/crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES, Role.MARKETING_SEO, Role.CUSTOMER_SERVICE)
@Controller('admin/leads')
export class CrmAdminController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  list(@Query() query: ListLeadsQueryDto) {
    return this.crmService.list(query.status, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('board')
  board() {
    return this.crmService.board();
  }

  @Get('assignable-staff')
  assignableStaff() {
    return this.crmService.assignableStaff();
  }

  @Get(':id')
  getLeadDetail(@Param('id') id: string) {
    return this.crmService.getLeadDetail(id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.crmService.update(id, dto, user.id);
  }

  @Post(':id/activities')
  addActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddLeadActivityDto,
  ) {
    return this.crmService.addActivity(id, user.id, dto);
  }

  @Patch('activities/:activityId/complete')
  completeTask(@Param('activityId') activityId: string) {
    return this.crmService.completeTask(activityId);
  }
}
