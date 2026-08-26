import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus, PaymentProviderType } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let cart: any;
  let inventory: any;
  let shipping: any;
  let payments: any;
  let notifications: any;

  const pricedCartFixture = {
    id: 'cart1',
    currency: 'VND',
    subtotal: 100000,
    itemCount: 2,
    items: [
      {
        id: 'ci1',
        productVariantId: 'v1',
        productId: 'p1',
        productName: 'Cashew W320',
        sku: 'SKU1',
        quantity: 2,
        unitPrice: 50000,
        priceSource: 'BASE_PRICE',
        currency: 'VND',
        lineTotal: 100000,
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'order1',
          orderNumber: 'ORD-2026-ABC123',
          currency: 'VND',
          items: pricedCartFixture.items,
        }),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      coupon: { findUnique: jest.fn(), update: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      address: { findUnique: jest.fn(), create: jest.fn() },
    };
    cart = {
      getPricedCart: jest.fn().mockResolvedValue(pricedCartFixture),
      getOrCreateCart: jest.fn().mockResolvedValue({ id: 'cart1' }),
      addItem: jest.fn(),
    };
    inventory = {
      getAvailableStock: jest.fn().mockResolvedValue(100),
      reserveStock: jest.fn().mockResolvedValue(undefined),
      releaseStock: jest.fn().mockResolvedValue(undefined),
    };
    shipping = {
      calculateShipping: jest.fn().mockReturnValue({
        zone: 'VIETNAM',
        method: 'FLAT_RATE',
        cost: 30000,
        currency: 'VND',
      }),
    };
    payments = {
      createPaymentForOrder: jest.fn().mockResolvedValue({
        payment: { id: 'pay1' },
        redirectUrl: null,
      }),
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };

    service = new OrdersService(
      prisma,
      cart,
      inventory,
      shipping,
      payments,
      notifications,
    );
  });

  describe('checkout', () => {
    const baseDto = {
      guestEmail: 'guest@example.com',
      shippingAddress: {
        fullName: 'A',
        phone: '0900',
        line1: 'x',
        city: 'HCMC',
        country: 'Vietnam',
      },
      paymentProvider: PaymentProviderType.COD,
    };

    it('rejects guest checkout without an email', async () => {
      await expect(
        service.checkout(null, 'sess1', { ...baseDto, guestEmail: undefined } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects checkout with an empty cart', async () => {
      cart.getPricedCart.mockResolvedValue({ ...pricedCartFixture, items: [] });
      await expect(service.checkout(null, 'sess1', baseDto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('reserves stock, creates the order, charges payment, clears the cart, and notifies', async () => {
      prisma.address.create.mockResolvedValue({ id: 'addr1', country: 'Vietnam' });

      const result = await service.checkout(null, 'sess1', baseDto as any);

      expect(inventory.reserveStock).toHaveBeenCalledWith('v1', 2);
      expect(prisma.order.create).toHaveBeenCalled();
      expect(payments.createPaymentForOrder).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order1', provider: PaymentProviderType.COD }),
      );
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart1' } });
      expect(notifications.notify).toHaveBeenCalledWith(
        'order.confirmed',
        expect.objectContaining({ to: 'guest@example.com' }),
      );
      expect(result.order.id).toBe('order1');
    });

    it('rolls back every prior reservation when a later item fails to reserve', async () => {
      cart.getPricedCart.mockResolvedValue({
        ...pricedCartFixture,
        items: [
          { ...pricedCartFixture.items[0], productVariantId: 'v1', quantity: 2 },
          { ...pricedCartFixture.items[0], productVariantId: 'v2', quantity: 3, id: 'ci2' },
        ],
      });
      inventory.reserveStock
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new BadRequestException('Insufficient stock'));

      await expect(service.checkout(null, 'sess1', baseDto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(inventory.releaseStock).toHaveBeenCalledWith('v1', 2);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rolls back reservations when order creation itself throws', async () => {
      prisma.address.create.mockResolvedValue({ id: 'addr1', country: 'Vietnam' });
      prisma.order.create.mockRejectedValue(new Error('db exploded'));

      await expect(service.checkout(null, 'sess1', baseDto as any)).rejects.toThrow('db exploded');
      expect(inventory.releaseStock).toHaveBeenCalledWith('v1', 2);
    });
  });

  describe('adminUpdateStatus', () => {
    it('releases reserved stock for every item when an order is cancelled', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order1',
        status: OrderStatus.PENDING,
        orderNumber: 'ORD-2026-ABC123',
        userId: null,
        guestEmail: 'guest@example.com',
        items: [{ productVariantId: 'v1', quantity: 2 }],
      });
      prisma.order.update.mockResolvedValue({ id: 'order1', status: OrderStatus.CANCELLED });

      await service.adminUpdateStatus(
        'order1',
        { status: OrderStatus.CANCELLED },
        'admin-user',
      );

      expect(inventory.releaseStock).toHaveBeenCalledWith('v1', 2);
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('rejects transitioning out of a terminal status', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order1',
        status: OrderStatus.DELIVERED,
        items: [],
      });

      await expect(
        service.adminUpdateStatus('order1', { status: OrderStatus.PROCESSING }, 'admin-user'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
