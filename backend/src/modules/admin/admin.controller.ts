import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/overview')
  overview(@Query('sinceDays') sinceDays?: string) {
    return this.adminService.getDashboardOverview(Number(sinceDays) || 30);
  }

  @Get('customers')
  customers(@Query() query: ListCustomersQueryDto) {
    return this.adminService.listCustomers(query.role, query.q, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('audit-logs')
  auditLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.adminService.listAuditLogs(query.entityType, query.page ?? 1, query.pageSize ?? 20);
  }
}
