import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let pricing: any;

  const variant = {
    id: 'v1',
    productId: 'p1',
    sku: 'SKU1',
    price: { toString: () => '50000' },
    weightLabel: '1kg',
    packagingLabel: 'Bag',
    gradeLabel: 'A',
    product: { name: 'Cashew', currency: 'VND' },
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue(variant),
      },
      rfq: {
        create: jest.fn().mockResolvedValue({ id: 'rfq1', items: [] }),
      },
    };
    pricing = {
      resolveUnitPrice: jest.fn().mockResolvedValue({ unitPrice: 50000, currency: 'VND', source: 'BASE_PRICE' }),
    };
    service = new CartService(prisma, pricing);
  });

  describe('getOrCreateCart', () => {
    it('creates a cart for a logged-in user when none exists', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);
      prisma.cart.create.mockResolvedValue({ id: 'cart1', items: [] });
      const cart = await service.getOrCreateCart(
        { id: 'u1', email: 'a@b.com', role: 'RETAIL_CUSTOMER', companyId: null } as any,
        null,
      );
      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: 'u1' } }),
      );
      expect(cart.id).toBe('cart1');
    });

    it('throws when a guest has no session id', async () => {
      await expect(service.getOrCreateCart(null, null)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reuses an existing guest cart by sessionId', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart-guest', items: [] });
      const cart = await service.getOrCreateCart(null, 'sess1');
      expect(cart.id).toBe('cart-guest');
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('creates a new cart item priced via PricingService', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart1', items: [] });
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await service.addItem(null, 'sess1', 'v1', 2);

      expect(pricing.resolveUnitPrice).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'p1', basePrice: 50000, quantity: 2 }),
      );
      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cartId: 'cart1', productVariantId: 'v1', quantity: 2 }),
        }),
      );
    });

    it('increments quantity when the variant is already in the cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart1', items: [] });
      prisma.cartItem.findUnique.mockResolvedValue({ id: 'ci1', quantity: 3 });

      await service.addItem(null, 'sess1', 'v1', 2);

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ci1' }, data: expect.objectContaining({ quantity: 5 }) }),
      );
    });

    it('throws NotFoundException for an unknown variant', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart1', items: [] });
      prisma.productVariant.findUnique.mockResolvedValue(null);
      await expect(service.addItem(null, 'sess1', 'missing', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getPricedCart', () => {
    it('recomputes and persists a changed price snapshot', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart1',
        currency: 'VND',
        items: [{ id: 'ci1', quantity: 2, priceSnapshot: { toString: () => '40000' }, productVariant: variant }],
      });
      pricing.resolveUnitPrice.mockResolvedValue({ unitPrice: 50000, currency: 'VND', source: 'PRICE_TIER' });

      const result = await service.getPricedCart(null, 'sess1');

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'ci1' },
        data: { priceSnapshot: 50000 },
      });
      expect(result.subtotal).toBe(100000);
    });
  });

  describe('convertToRfq', () => {
    it('rejects converting an empty cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'cart1', items: [] });
      await expect(
        service.convertToRfq({ id: 'u1', email: 'a@b.com', role: 'RETAIL_CUSTOMER', companyId: null } as any, null),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a DRAFT rfq mirroring cart items', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'cart1',
        items: [{ id: 'ci1', quantity: 2, productVariant: variant }],
      });

      await service.convertToRfq(
        { id: 'u1', email: 'a@b.com', role: 'RETAIL_CUSTOMER', companyId: null } as any,
        null,
      );

      expect(prisma.rfq.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
            items: { create: [expect.objectContaining({ productId: 'p1', quantity: 2 })] },
          }),
        }),
      );
    });
  });
});
