import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrencyService, serializeExchangeRate, VND_DISPLAY_RATE } from './currency.service';
import { UpsertRateDto } from './dto/upsert-rate.dto';

@ApiTags('currency-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/currency')
export class CurrencyAdminController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  async listRates() {
    const rates = await this.currencyService.listRates();
    return [VND_DISPLAY_RATE, ...rates.map(serializeExchangeRate)];
  }

  @Put('rates/:targetCurrency')
  async upsertRate(@Param('targetCurrency') targetCurrency: string, @Body() dto: UpsertRateDto) {
    const rate = await this.currencyService.upsertRate(targetCurrency, dto.rate);
    return serializeExchangeRate(rate);
  }

  @Delete('rates/:id')
  async deleteRate(@Param('id') id: string) {
    await this.currencyService.deleteRate(id);
    return { success: true };
  }
}
