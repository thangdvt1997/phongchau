import { NotFoundException } from '@nestjs/common';
import { B2bService } from './b2b.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('B2bService', () => {
  let service: B2bService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
      },
    };
    service = new B2bService(prisma as unknown as PrismaService);
  });

  describe('getMyCompany', () => {
    it('throws NotFoundException when the user has no companyId', async () => {
      await expect(service.getMyCompany(null)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getMyCompany(undefined)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the company record cannot be found', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      await expect(service.getMyCompany('company-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the company with creditLimit coerced to a number', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Acme Co',
        creditLimit: { toString: () => '5000' } as any,
      });

      const result = await service.getMyCompany('company-1');

      expect(result.creditLimit).toBe(5000);
      expect(result.id).toBe('company-1');
    });

    it('returns null creditLimit when the company has none set', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        name: 'Acme Co',
        creditLimit: null,
      });

      const result = await service.getMyCompany('company-1');

      expect(result.creditLimit).toBeNull();
    });
  });
});
