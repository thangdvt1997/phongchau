import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrencyService, serializeExchangeRate, VND_DISPLAY_RATE } from './currency.service';
import { ConvertCurrencyQueryDto } from './dto/convert-currency-query.dto';

/**
 * Public, unauthenticated DISPLAY-conversion endpoints. Every order/payment/cart still
 * settles in VND under the hood — these routes only tell the frontend what to *show*
 * a shopper who picked a different display currency. See ROADMAP.md for the future
 * checkout-in-foreign-currency work this deliberately does not attempt.
 */
@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /** All configured rates, plus a synthetic VND entry (always available at rate 1) so the
   * frontend never has to special-case the base currency. */
  @Get('rates')
  async listRates() {
    const rates = await this.currencyService.listRates();
    return [VND_DISPLAY_RATE, ...rates.map(serializeExchangeRate)];
  }

  @Get('convert')
  async convert(@Query() query: ConvertCurrencyQueryDto) {
    const result = await this.currencyService.convert(query.amount, query.target);
    if (!result) {
      throw new NotFoundException(`No exchange rate configured for ${query.target.toUpperCase()}`);
    }
    return result;
  }
}
