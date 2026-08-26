import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrencyController } from './currency.controller';
import { CurrencyAdminController } from './currency-admin.controller';
import { CurrencyService } from './currency.service';

@Module({
  controllers: [CurrencyController, CurrencyAdminController],
  providers: [CurrencyService, RolesGuard],
  exports: [CurrencyService],
})
export class CurrencyModule {}
