import { NotFoundException } from '@nestjs/common';
import { CmsService } from './cms.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BlogCategory, ContentStatus } from '@prisma/client';

describe('CmsService', () => {
  let service: CmsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      blog: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CmsService(prisma as unknown as PrismaService);
  });

  describe('findPublished', () => {
    it('only returns PUBLISHED posts ordered by publishedAt desc', async () => {
      prisma.blog.findMany.mockResolvedValue([]);
      prisma.blog.count.mockResolvedValue(0);

      await service.findPublished({ page: 1, pageSize: 20 });

      expect(prisma.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ContentStatus.PUBLISHED },
          orderBy: { publishedAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('filters by category when provided', async () => {
      prisma.blog.findMany.mockResolvedValue([]);
      prisma.blog.count.mockResolvedValue(0);

      await service.findPublished({ page: 2, pageSize: 10, category: BlogCategory.RECIPE });

      expect(prisma.blog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ContentStatus.PUBLISHED, category: BlogCategory.RECIPE },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findPublishedBySlug', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.blog.findUnique.mockResolvedValue(null);
      await expect(service.findPublishedBySlug('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFoundException when not published', async () => {
      prisma.blog.findUnique.mockResolvedValue({ slug: 'draft-post', status: ContentStatus.DRAFT });
      await expect(service.findPublishedBySlug('draft-post')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the post when published', async () => {
      const post = { slug: 'live-post', status: ContentStatus.PUBLISHED };
      prisma.blog.findUnique.mockResolvedValue(post);
      await expect(service.findPublishedBySlug('live-post')).resolves.toEqual(post);
    });
  });

  describe('adminCreate', () => {
    it('generates a slug from the title when not provided', async () => {
      prisma.blog.findUnique.mockResolvedValue(null);
      prisma.blog.create.mockResolvedValue({ id: 'b1' });

      await service.adminCreate(
        { title: 'Hello World!', content: 'body' } as any,
        'author-1',
      );

      expect(prisma.blog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'hello-world', authorId: 'author-1' }),
        }),
      );
    });

    it('appends a suffix when the generated slug collides', async () => {
      prisma.blog.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // base slug taken
        .mockResolvedValueOnce(null); // suffixed slug free
      prisma.blog.create.mockResolvedValue({ id: 'b2' });

      await service.adminCreate({ title: 'Hello World', content: 'body' } as any, 'author-1');

      const createArgs = prisma.blog.create.mock.calls[0][0];
      expect(createArgs.data.slug).toMatch(/^hello-world-[a-z0-9]{6}$/);
    });

    it('stamps publishedAt when status is PUBLISHED on create', async () => {
      prisma.blog.findUnique.mockResolvedValue(null);
      prisma.blog.create.mockResolvedValue({ id: 'b3' });

      await service.adminCreate(
        { title: 'Now Live', content: 'body', status: ContentStatus.PUBLISHED } as any,
        'author-1',
      );

      const createArgs = prisma.blog.create.mock.calls[0][0];
      expect(createArgs.data.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('adminUpdate', () => {
    it('stamps publishedAt only the first time a post is published', async () => {
      prisma.blog.findUnique.mockResolvedValue({
        id: 'b1',
        title: 'T',
        slug: 's',
        category: BlogCategory.BLOG,
        excerpt: null,
        content: 'c',
        coverImageUrl: null,
        status: ContentStatus.DRAFT,
        publishedAt: null,
        seoTitle: null,
        seoDescription: null,
        canonicalUrl: null,
        ogImage: null,
        noIndex: false,
      });
      prisma.blog.update.mockResolvedValue({});

      await service.adminUpdate('b1', { status: ContentStatus.PUBLISHED } as any);

      const updateArgs = prisma.blog.update.mock.calls[0][0];
      expect(updateArgs.data.publishedAt).toBeInstanceOf(Date);
    });

    it('does not overwrite an existing publishedAt', async () => {
      const existingDate = new Date('2020-01-01');
      prisma.blog.findUnique.mockResolvedValue({
        id: 'b1',
        title: 'T',
        slug: 's',
        category: BlogCategory.BLOG,
        excerpt: null,
        content: 'c',
        coverImageUrl: null,
        status: ContentStatus.PUBLISHED,
        publishedAt: existingDate,
        seoTitle: null,
        seoDescription: null,
        canonicalUrl: null,
        ogImage: null,
        noIndex: false,
      });
      prisma.blog.update.mockResolvedValue({});

      await service.adminUpdate('b1', { status: ContentStatus.PUBLISHED } as any);

      const updateArgs = prisma.blog.update.mock.calls[0][0];
      expect(updateArgs.data.publishedAt).toBe(existingDate);
    });
  });

  describe('adminDelete', () => {
    it('throws NotFoundException when the post does not exist', async () => {
      prisma.blog.findUnique.mockResolvedValue(null);
      await expect(service.adminDelete('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.blog.delete).not.toHaveBeenCalled();
    });
  });
});
