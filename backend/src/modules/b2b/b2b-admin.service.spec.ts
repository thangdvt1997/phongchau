import { BadRequestException, NotFoundException } from '@nestjs/common';
import { B2bAdminService } from './b2b-admin.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CompanyStatus } from '@prisma/client';

describe('B2bAdminService', () => {
  let service: B2bAdminService;
  let prisma: any;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      company: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      priceTier: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      customerPrice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new B2bAdminService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('listCompanies', () => {
    it('paginates and serializes creditLimit', async () => {
      prisma.company.findMany.mockResolvedValue([
        { id: 'c1', creditLimit: { toString: () => '1000' }, users: [] },
      ]);
      prisma.company.count.mockResolvedValue(1);

      const result = await service.listCompanies({ page: 2, pageSize: 5 } as any);

      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result).toEqual({
        items: [{ id: 'c1', creditLimit: 1000, users: [] }],
        total: 1,
        page: 2,
        pageSize: 5,
      });
    });

    it('filters by status when provided', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.count.mockResolvedValue(0);

      await service.listCompanies({ status: CompanyStatus.PENDING } as any);

      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: CompanyStatus.PENDING } }),
      );
    });
  });

  describe('getCompany', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(service.getCompany('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('approveCompany', () => {
    it('sets status APPROVED and notifies the primary user', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'c1', name: 'Acme' });
      prisma.company.update.mockResolvedValue({ id: 'c1', name: 'Acme', creditLimit: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });

      const result = await service.approveCompany('c1');

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: CompanyStatus.APPROVED },
      });
      expect(notifications.notify).toHaveBeenCalledWith('b2b.approved', {
        userId: 'u1',
        data: { companyName: 'Acme' },
      });
      expect(result.id).toBe('c1');
    });

    it('does not throw when the notification call fails', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'c1', name: 'Acme' });
      prisma.company.update.mockResolvedValue({ id: 'c1', name: 'Acme', creditLimit: null });
      prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      notifications.notify.mockRejectedValue(new Error('notification service down'));

      await expect(service.approveCompany('c1')).resolves.toBeDefined();
    });

    it('throws NotFoundException for an unknown company', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(service.approveCompany('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.company.update).not.toHaveBeenCalled();
    });
  });

  describe('rejectCompany', () => {
    it('sets status REJECTED and stores the reason', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.company.update.mockResolvedValue({ id: 'c1', creditLimit: null });

      await service.rejectCompany('c1', { reason: 'Invalid tax ID' });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: CompanyStatus.REJECTED, rejectionReason: 'Invalid tax ID' },
      });
    });
  });

  describe('updateCompany', () => {
    it('updates only the provided fields', async () => {
      prisma.company.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.company.update.mockResolvedValue({ id: 'c1', creditLimit: null });

      await service.updateCompany('c1', { creditLimit: 50000 });

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { creditLimit: 50000 },
      });
    });
  });

  describe('createPriceTier', () => {
    it('rejects when maxQty is less than minQty', async () => {
      await expect(
        service.createPriceTier('p1', { minQty: 10, maxQty: 5, price: 1, currency: 'VND' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.priceTier.findMany).not.toHaveBeenCalled();
    });

    it('rejects overlapping ranges for the same product', async () => {
      prisma.priceTier.findMany.mockResolvedValue([
        { id: 't1', minQty: 1, maxQty: 10, price: 1, currency: 'VND' },
      ]);

      await expect(
        service.createPriceTier('p1', { minQty: 5, maxQty: 15, price: 1, currency: 'VND' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.priceTier.create).not.toHaveBeenCalled();
    });

    it('allows a non-overlapping range and treats null maxQty as unbounded', async () => {
      prisma.priceTier.findMany.mockResolvedValue([
        { id: 't1', minQty: 1, maxQty: 10, price: 1, currency: 'VND' },
      ]);
      prisma.priceTier.create.mockResolvedValue({
        id: 't2',
        minQty: 11,
        maxQty: null,
        price: 5,
        currency: 'VND',
      });

      const result = await service.createPriceTier('p1', {
        minQty: 11,
        price: 5,
        currency: 'VND',
      });

      expect(result.price).toBe(5);
    });
  });

  describe('deletePriceTier', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.priceTier.findUnique.mockResolvedValue(null);
      await expect(service.deletePriceTier('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('upsertCustomerPrice', () => {
    it('upserts on the [companyId, productId] compound key', async () => {
      prisma.customerPrice.upsert.mockResolvedValue({
        id: 'cp1',
        price: 42,
        currency: 'VND',
      });

      const result = await service.upsertCustomerPrice('c1', {
        productId: 'p1',
        price: 42,
        currency: 'VND',
      });

      expect(prisma.customerPrice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId_productId: { companyId: 'c1', productId: 'p1' } },
        }),
      );
      expect(result.price).toBe(42);
    });
  });

  describe('deleteCustomerPrice', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.customerPrice.findUnique.mockResolvedValue(null);
      await expect(service.deleteCustomerPrice('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
