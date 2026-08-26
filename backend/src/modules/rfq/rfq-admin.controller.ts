import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { AdminRfqQueryDto } from './dto/admin-rfq-query.dto';
import { UpdateRfqStatusDto } from './dto/update-rfq-status.dto';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '@prisma/client';

@ApiTags('rfq')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES)
@Controller('admin/rfq')
export class RfqAdminController {
  constructor(private readonly rfqService: RfqService) {}

  @Get()
  findAll(@Query() query: AdminRfqQueryDto) {
    return this.rfqService.adminList(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rfqService.adminGetOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRfqStatusDto,
  ) {
    return this.rfqService.adminUpdateStatus(id, dto, user);
  }

  @Post(':id/quotations')
  createQuotation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.rfqService.adminCreateQuotation(id, dto, user);
  }
}
