import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderNotesDto } from './dto/order-notes.dto';
import { OrderStatus } from '@prisma/client';

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cart: CartService,
    private readonly inventory: InventoryService,
    private readonly shipping: ShippingService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkout(user: AuthenticatedUser | null, sessionId: string | null, dto: CheckoutDto) {
    if (!user && !dto.guestEmail) {
      throw new BadRequestException('guestEmail is required for guest checkout');
    }
    // Fail fast on an unsupported/disabled payment provider before reserving any stock
    // or creating the order — see PaymentsService.ensureProviderEnabled for why.
    this.payments.ensureProviderEnabled(dto.paymentProvider);

    const pricedCart = await this.cart.getPricedCart(user, sessionId);
    if (pricedCart.items.length === 0) {
      throw new BadRequestException('Cannot checkout an empty cart');
    }

    // Reserve stock for every line item; roll back any partial reservation on failure so a
    // stock shortfall on item N never leaves items 1..N-1 silently held.
    const reserved: { productVariantId: string; quantity: number }[] = [];
    try {
      for (const item of pricedCart.items) {
        await this.inventory.reserveStock(item.productVariantId, item.quantity);
        reserved.push({ productVariantId: item.productVariantId, quantity: item.quantity });
      }
    } catch (err) {
      for (const r of reserved) {
        await this.inventory.releaseStock(r.productVariantId, r.quantity);
      }
      throw err;
    }

    try {
      const shippingAddress = await this.resolveAddress(
        user,
        dto.shippingAddressId,
        dto.shippingAddress,
        'SHIPPING',
      );
      const billingSameAsShipping = dto.billingSameAsShipping !== false;
      const billingAddress = billingSameAsShipping
        ? shippingAddress
        : await this.resolveAddress(user, dto.billingAddressId, dto.billingAddress, 'BILLING');

      const coupon = dto.couponCode ? await this.validateCoupon(dto.couponCode, pricedCart.subtotal) : null;
      const discountTotal = coupon ? this.computeDiscount(coupon, pricedCart.subtotal) : 0;

      const weightKg = Math.max(1, pricedCart.items.reduce((sum, i) => sum + i.quantity, 0));
      const shippingQuote = this.shipping.calculateShipping({
        destinationCountry: shippingAddress.country,
        weightKg,
        subtotal: pricedCart.subtotal,
        currency: pricedCart.currency,
      });
      const shippingTotal = coupon?.type === 'FREE_SHIPPING' ? 0 : shippingQuote.cost;

      const taxTotal = 0; // P0: no tax engine yet; agri exports are frequently VAT-exempt anyway.
      const grandTotal = Math.max(0, pricedCart.subtotal - discountTotal) + shippingTotal + taxTotal;
      const orderNumber = `ORD-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          userId: user?.id,
          companyId: user?.companyId ?? undefined,
          guestEmail: user ? undefined : dto.guestEmail,
          subtotal: pricedCart.subtotal,
          discountTotal,
          shippingTotal,
          taxTotal,
          grandTotal,
          currency: pricedCart.currency,
          couponId: coupon?.id,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          poNumber: dto.poNumber,
          deliveryNote: dto.deliveryNote,
          customerNote: dto.customerNote,
          items: {
            create: pricedCart.items.map((item) => ({
              productVariantId: item.productVariantId,
              productNameSnapshot: item.productName,
              skuSnapshot: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
          statusHistory: {
            create: [{ status: OrderStatus.PENDING, note: 'Order created' }],
          },
        },
        include: { items: true },
      });

      if (coupon) {
        await this.prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const paymentResult = await this.payments.createPaymentForOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: grandTotal,
        currency: order.currency,
        provider: dto.paymentProvider,
      });

      await this.cart.getOrCreateCart(user, sessionId).then((c) =>
        this.prisma.cartItem.deleteMany({ where: { cartId: c.id } }),
      );

      await this.notifications
        .notify('order.confirmed', {
          userId: user?.id,
          to: user ? undefined : dto.guestEmail,
          data: { orderNumber: order.orderNumber, grandTotal, currency: order.currency },
        })
        .catch(() => undefined);

      return { order, redirectUrl: paymentResult.redirectUrl };
    } catch (err) {
      for (const r of reserved) {
        await this.inventory.releaseStock(r.productVariantId, r.quantity);
      }
      throw err;
    }
  }

  async listMyOrders(user: AuthenticatedUser, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { items: true },
      }),
      this.prisma.order.count({ where: { userId: user.id } }),
    ]);
    return { items, total, page, pageSize };
  }

  async getOrderForUser(user: AuthenticatedUser, orderId: string) {
    const order = await this.getOrderDetail(orderId);
    const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'CUSTOMER_SERVICE'].includes(user.role);
    if (!isPrivileged && order.userId !== user.id) {
      throw new ForbiddenException('This order does not belong to you');
    }
    return order;
  }

  async trackByOrderNumber(orderNumber: string, email?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } }, shipments: { include: { tracking: true } } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const ownerEmail = order.guestEmail;
    if (ownerEmail && email && ownerEmail.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async reorder(user: AuthenticatedUser, orderId: string) {
    const order = await this.getOrderForUser(user, orderId);
    for (const item of order.items) {
      await this.cart.addItem(user, null, item.productVariantId, item.quantity);
    }
    return this.cart.getPricedCart(user, null);
  }

  // ---------- Admin ----------

  async adminList(status?: OrderStatus, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { items: true, user: { select: { id: true, email: true, fullName: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async adminGetOrder(orderId: string) {
    return this.getOrderDetail(orderId);
  }

  async adminUpdateStatus(orderId: string, dto: UpdateOrderStatusDto, changedBy: string) {
    const order = await this.getOrderDetail(orderId);
    if (TERMINAL_STATUSES.includes(order.status) && order.status !== dto.status) {
      throw new BadRequestException(`Order is already in a terminal state: ${order.status}`);
    }

    if (dto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        await this.inventory.releaseStock(item.productVariantId, item.quantity).catch(() => undefined);
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        statusHistory: { create: { status: dto.status, note: dto.note, changedBy } },
      },
    });

    await this.notifications
      .notify('order.status_changed', {
        userId: order.userId ?? undefined,
        to: order.guestEmail ?? undefined,
        data: { orderNumber: order.orderNumber, status: dto.status },
      })
      .catch(() => undefined);

    return updated;
  }

  async adminUpdateNotes(orderId: string, dto: OrderNotesDto) {
    await this.getOrderDetail(orderId);
    return this.prisma.order.update({ where: { id: orderId }, data: dto });
  }

  // ---------- Internal helpers ----------

  private async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
        shipments: { include: { tracking: true } },
        shippingAddress: true,
        billingAddress: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private async resolveAddress(
    user: AuthenticatedUser | null,
    addressId: string | undefined,
    input: import('./dto/address-input.dto').AddressInputDto | undefined,
    type: 'SHIPPING' | 'BILLING',
  ) {
    if (addressId) {
      const address = await this.prisma.address.findUnique({ where: { id: addressId } });
      if (!address || (user && address.userId !== user.id)) {
        throw new NotFoundException('Address not found');
      }
      return address;
    }
    if (!input) {
      throw new BadRequestException(`A ${type.toLowerCase()} address is required`);
    }
    return this.prisma.address.create({
      data: { ...input, type: type as any, userId: user?.id },
    });
  }

  private async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }
    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `This coupon requires a minimum order of ${Number(coupon.minOrderAmount)}`,
      );
    }
    return coupon;
  }

  private computeDiscount(coupon: { type: string; value: unknown }, subtotal: number): number {
    const value = Number(coupon.value);
    if (coupon.type === 'PERCENTAGE') return (subtotal * value) / 100;
    if (coupon.type === 'FIXED') return Math.min(value, subtotal);
    return 0; // FREE_SHIPPING doesn't discount the subtotal, it zeroes shippingTotal instead.
  }
}
