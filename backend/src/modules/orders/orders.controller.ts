import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

const CART_SESSION_HEADER = 'x-cart-session';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('checkout')
  checkout(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers(CART_SESSION_HEADER) sessionId: string | undefined,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(user, sessionId ?? null, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('orders')
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.listMyOrders(user, query.page ?? 1, query.pageSize ?? 20);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.getOrderForUser(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('orders/:id/reorder')
  reorder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.reorder(user, id);
  }

  @Get('orders/track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string, @Query('email') email?: string) {
    return this.ordersService.trackByOrderNumber(orderNumber, email);
  }
}
