import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import slugify from 'slugify';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContentStatus } from '@prisma/client';
import { QueryBlogDto } from './dto/query-blog.dto';
import { QueryAdminBlogDto } from './dto/query-admin-blog.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

// Lowercase alnum only, so slug suffixes never introduce characters that
// look out of place next to a slugify()'d base (no '_' or '-' from nanoid's
// default alphabet).
const slugSuffix = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  category: true,
  excerpt: true,
  coverImageUrl: true,
  publishedAt: true,
} as const;

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished(query: QueryBlogDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      status: ContentStatus.PUBLISHED,
      ...(query.category ? { category: query.category } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findPublishedBySlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({ where: { slug } });
    if (!blog || blog.status !== ContentStatus.PUBLISHED) {
      throw new NotFoundException('Blog post not found');
    }
    return blog;
  }

  // ---------- Admin ----------

  async adminFindAll(query: QueryAdminBlogDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adminFindOne(id: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }
    return blog;
  }

  async adminCreate(dto: CreateBlogDto, authorId: string) {
    const slug = await this.generateUniqueSlug(dto.slug ?? dto.title);
    const status = dto.status ?? ContentStatus.DRAFT;
    const publishedAt = status === ContentStatus.PUBLISHED ? new Date() : null;

    return this.prisma.blog.create({
      data: {
        title: dto.title,
        slug,
        category: dto.category,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImageUrl: dto.coverImageUrl,
        status,
        publishedAt,
        authorId,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        canonicalUrl: dto.canonicalUrl,
        ogImage: dto.ogImage,
        noIndex: dto.noIndex ?? false,
      },
    });
  }

  async adminUpdate(id: string, dto: UpdateBlogDto) {
    const existing = await this.adminFindOne(id);

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.generateUniqueSlug(dto.slug, id);
    }

    let publishedAt = existing.publishedAt;
    if (dto.status === ContentStatus.PUBLISHED && !existing.publishedAt) {
      publishedAt = new Date();
    }

    return this.prisma.blog.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        slug,
        category: dto.category ?? existing.category,
        excerpt: dto.excerpt !== undefined ? dto.excerpt : existing.excerpt,
        content: dto.content ?? existing.content,
        coverImageUrl: dto.coverImageUrl !== undefined ? dto.coverImageUrl : existing.coverImageUrl,
        status: dto.status ?? existing.status,
        publishedAt,
        seoTitle: dto.seoTitle !== undefined ? dto.seoTitle : existing.seoTitle,
        seoDescription: dto.seoDescription !== undefined ? dto.seoDescription : existing.seoDescription,
        canonicalUrl: dto.canonicalUrl !== undefined ? dto.canonicalUrl : existing.canonicalUrl,
        ogImage: dto.ogImage !== undefined ? dto.ogImage : existing.ogImage,
        noIndex: dto.noIndex !== undefined ? dto.noIndex : existing.noIndex,
      },
    });
  }

  async adminDelete(id: string) {
    await this.adminFindOne(id);
    await this.prisma.blog.delete({ where: { id } });
    return { success: true };
  }

  private async generateUniqueSlug(source: string, excludeId?: string): Promise<string> {
    const base = slugify(source, { lower: true, strict: true });
    let candidate = base;
    // Loop until we find a slug not used by any other blog post.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.blog.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${base}-${slugSuffix()}`;
    }
  }
}
