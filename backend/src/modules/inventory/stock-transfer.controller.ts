import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { StockTransferService } from './stock-transfer.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { StockTransferQueryDto } from './dto/stock-transfer-query.dto';

@ApiTags('admin/inventory/transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE_STAFF)
@Controller('admin/inventory/transfers')
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStockTransferDto) {
    return this.stockTransferService.create(dto, user.id);
  }

  @Get()
  list(@Query() query: StockTransferQueryDto) {
    return this.stockTransferService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockTransferService.findOne(id);
  }

  @Post(':id/in-transit')
  markInTransit(@Param('id') id: string) {
    return this.stockTransferService.markInTransit(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.stockTransferService.complete(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.stockTransferService.cancel(id);
  }
}
