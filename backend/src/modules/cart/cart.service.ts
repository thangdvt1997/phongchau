import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PricingService } from '../b2b/pricing.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Prisma, RfqStatus } from '@prisma/client';

// `satisfies` (not a plain `: Prisma.CartInclude` annotation) keeps the literal shape so
// Prisma's fluent API can still infer the exact `cart.items[].productVariant.product` type
// at every call site that spreads this constant into `include`.
const CART_INCLUDE = {
  items: {
    include: {
      productVariant: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.CartInclude;

export interface PricedCartItem {
  id: string;
  productVariantId: string;
  productId: string;
  productName: string;
  sku: string;
  weightLabel: string | null;
  packagingLabel: string | null;
  quantity: number;
  unitPrice: number;
  priceSource: string;
  currency: string;
  lineTotal: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async getOrCreateCart(user: AuthenticatedUser | null, sessionId: string | null) {
    if (user) {
      const existing = await this.prisma.cart.findUnique({
        where: { userId: user.id },
        include: CART_INCLUDE,
      });
      if (existing) return existing;
      return this.prisma.cart.create({ data: { userId: user.id }, include: CART_INCLUDE });
    }

    if (!sessionId) {
      throw new BadRequestException('A cart session id is required for guest carts');
    }
    const existing = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: CART_INCLUDE,
    });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { sessionId }, include: CART_INCLUDE });
  }

  /** Re-prices every line item live (tier/contract pricing can change between visits) and
   * returns the cart with a computed subtotal — this is what all cart reads should call. */
  async getPricedCart(user: AuthenticatedUser | null, sessionId: string | null) {
    const cart = await this.getOrCreateCart(user, sessionId);
    const companyId = user?.companyId ?? null;

    let subtotal = 0;
    const items: PricedCartItem[] = [];
    for (const item of cart.items) {
      const variant = item.productVariant;
      const resolved = await this.pricing.resolveUnitPrice({
        productId: variant.productId,
        basePrice: Number(variant.price),
        currency: variant.product.currency,
        quantity: item.quantity,
        companyId,
      });

      if (Number(item.priceSnapshot) !== resolved.unitPrice) {
        await this.prisma.cartItem.update({
          where: { id: item.id },
          data: { priceSnapshot: resolved.unitPrice },
        });
      }

      const lineTotal = resolved.unitPrice * item.quantity;
      subtotal += lineTotal;
      items.push({
        id: item.id,
        productVariantId: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        sku: variant.sku,
        weightLabel: variant.weightLabel,
        packagingLabel: variant.packagingLabel,
        quantity: item.quantity,
        unitPrice: resolved.unitPrice,
        priceSource: resolved.source,
        currency: resolved.currency,
        lineTotal,
      });
    }

    return {
      id: cart.id,
      currency: cart.currency,
      items,
      subtotal,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  async addItem(
    user: AuthenticatedUser | null,
    sessionId: string | null,
    productVariantId: string,
    quantity: number,
  ) {
    const cart = await this.getOrCreateCart(user, sessionId);
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: true },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const resolved = await this.pricing.resolveUnitPrice({
      productId: variant.productId,
      basePrice: Number(variant.price),
      currency: variant.product.currency,
      quantity,
      companyId: user?.companyId ?? null,
    });

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productVariantId: { cartId: cart.id, productVariantId } },
    });

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          priceSnapshot: resolved.unitPrice,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productVariantId,
          quantity,
          priceSnapshot: resolved.unitPrice,
        },
      });
    }

    return this.getPricedCart(user, sessionId);
  }

  async updateItemQuantity(
    user: AuthenticatedUser | null,
    sessionId: string | null,
    itemId: string,
    quantity: number,
  ) {
    const cart = await this.getOrCreateCart(user, sessionId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getPricedCart(user, sessionId);
  }

  async removeItem(user: AuthenticatedUser | null, sessionId: string | null, itemId: string) {
    const cart = await this.getOrCreateCart(user, sessionId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getPricedCart(user, sessionId);
  }

  async mergeGuestCartIntoUserCart(user: AuthenticatedUser, guestSessionId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId: guestSessionId },
      include: { items: true },
    });
    if (!guestCart) {
      return this.getPricedCart(user, null);
    }

    const userCart = await this.getOrCreateCart(user, null);

    for (const guestItem of guestCart.items) {
      const existing = await this.prisma.cartItem.findUnique({
        where: {
          cartId_productVariantId: {
            cartId: userCart.id,
            productVariantId: guestItem.productVariantId,
          },
        },
      });
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + guestItem.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productVariantId: guestItem.productVariantId,
            quantity: guestItem.quantity,
            priceSnapshot: guestItem.priceSnapshot,
          },
        });
      }
    }

    await this.prisma.cart.delete({ where: { id: guestCart.id } });
    return this.getPricedCart(user, null);
  }

  /** Spec section 9: "Convert cart -> RFQ". Creates a DRAFT RFQ mirroring the cart's line
   * items so the customer can submit it through the RFQ flow instead of checking out. */
  async convertToRfq(user: AuthenticatedUser, sessionId: string | null) {
    const cart = await this.getOrCreateCart(user, sessionId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot convert an empty cart to an RFQ');
    }

    const rfqNumber = `RFQ-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
    const rfq = await this.prisma.rfq.create({
      data: {
        rfqNumber,
        userId: user.id,
        companyId: user.companyId,
        status: RfqStatus.DRAFT,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productVariant.productId,
            specification: item.productVariant.gradeLabel ?? undefined,
            quantity: item.quantity,
            unit: item.productVariant.weightLabel ?? 'unit',
            packaging: item.productVariant.packagingLabel ?? undefined,
          })),
        },
      },
      include: { items: true },
    });

    return rfq;
  }
}
