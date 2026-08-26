import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { nanoid } from 'nanoid';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

const CART_SESSION_HEADER = 'x-cart-session';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** Guests get a generated session id echoed back on every response; the frontend must
   * persist it (e.g. localStorage) and resend it as `x-cart-session` on every cart call. */
  private resolveSessionId(
    user: AuthenticatedUser | null,
    incoming: string | undefined,
    res: Response,
  ): string | null {
    if (user) return null;
    const sessionId = incoming ?? nanoid();
    res.setHeader(CART_SESSION_HEADER, sessionId);
    return sessionId;
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getCart(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers(CART_SESSION_HEADER) sessionHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.resolveSessionId(user, sessionHeader, res);
    return this.cartService.getPricedCart(user, sessionId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('items')
  async addItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers(CART_SESSION_HEADER) sessionHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddCartItemDto,
  ) {
    const sessionId = this.resolveSessionId(user, sessionHeader, res);
    return this.cartService.addItem(user, sessionId, dto.productVariantId, dto.quantity);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers(CART_SESSION_HEADER) sessionHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const sessionId = this.resolveSessionId(user, sessionHeader, res);
    return this.cartService.updateItemQuantity(user, sessionId, itemId, dto.quantity);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: AuthenticatedUser | null,
    @Headers(CART_SESSION_HEADER) sessionHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Param('itemId') itemId: string,
  ) {
    const sessionId = this.resolveSessionId(user, sessionHeader, res);
    return this.cartService.removeItem(user, sessionId, itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('merge')
  async merge(@CurrentUser() user: AuthenticatedUser, @Body() dto: MergeCartDto) {
    return this.cartService.mergeGuestCartIntoUserCart(user, dto.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('convert-to-rfq')
  async convertToRfq(
    @CurrentUser() user: AuthenticatedUser,
    @Headers(CART_SESSION_HEADER) sessionHeader: string | undefined,
  ) {
    return this.cartService.convertToRfq(user, sessionHeader ?? null);
  }
}
