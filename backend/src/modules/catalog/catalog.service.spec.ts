import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      brand: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      origin: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      certification: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
    };
    service = new CatalogService(prisma as unknown as PrismaService);
  });

  describe('getCategoryTree', () => {
    it('nests children under their parent', async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: 'root', name: 'Root', slug: 'root', parentId: null, description: null, imageUrl: null, position: 0 },
        { id: 'child', name: 'Child', slug: 'child', parentId: 'root', description: null, imageUrl: null, position: 0 },
      ]);

      const tree = await service.getCategoryTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('root');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('child');
    });
  });

  describe('createCategory', () => {
    it('auto-generates a unique slug from the name', async () => {
      prisma.category.findUnique.mockResolvedValueOnce(null);
      prisma.category.create.mockResolvedValue({ id: 'c1', name: 'Fresh Fruit', slug: 'fresh-fruit' });

      await service.createCategory({ name: 'Fresh Fruit' } as any);

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'fresh-fruit' }) }),
      );
    });

    it('appends a suffix when the slug collides', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);
      prisma.category.create.mockResolvedValue({ id: 'c2' });

      await service.createCategory({ name: 'Fresh Fruit' } as any);

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'fresh-fruit-1' }) }),
      );
    });
  });

  describe('deleteCategory', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.deleteCategory('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the category still has products', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.product.count.mockResolvedValue(3);
      await expect(service.deleteCategory('c1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('deletes when no products reference it', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.product.count.mockResolvedValue(0);
      const result = await service.deleteCategory('c1');
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(result).toEqual({ success: true });
    });
  });

  describe('getBrandById', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);
      await expect(service.getBrandById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createCertification', () => {
    it('creates a certification with the given code', async () => {
      prisma.certification.create.mockResolvedValue({ id: 'cert1', code: 'GLOBALGAP' });
      const result = await service.createCertification({ name: 'GlobalGAP', code: 'GLOBALGAP' });
      expect(prisma.certification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'GLOBALGAP' }) }),
      );
      expect(result.code).toBe('GLOBALGAP');
    });
  });
});
