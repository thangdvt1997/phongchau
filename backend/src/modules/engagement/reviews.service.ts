import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, ReviewStatus } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { QueryAdminReviewsDto } from './dto/query-admin-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Public ----------

  async findApprovedForProduct(productId: string, query: QueryReviewsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { productId, status: ReviewStatus.APPROVED };

    const [items, total, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      averageRating: aggregate._avg.rating ?? 0,
    };
  }

  async create(productId: string, userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const isVerifiedPurchase = await this.hasDeliveredPurchase(productId, userId);

    return this.prisma.review.create({
      data: {
        productId,
        userId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        imageUrls: dto.imageUrls ?? [],
        videoUrl: dto.videoUrl,
        isVerifiedPurchase,
        status: ReviewStatus.PENDING,
      },
    });
  }

  // ---------- Admin ----------

  async adminFindAll(query: QueryAdminReviewsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async approve(id: string) {
    await this.findOrThrow(id);
    return this.prisma.review.update({ where: { id }, data: { status: ReviewStatus.APPROVED } });
  }

  async reject(id: string) {
    await this.findOrThrow(id);
    return this.prisma.review.update({ where: { id }, data: { status: ReviewStatus.REJECTED } });
  }

  // ---------- helpers ----------

  private async hasDeliveredPurchase(productId: string, userId: string): Promise<boolean> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: {
        productVariant: { productId },
        order: { userId, status: OrderStatus.DELIVERED },
      },
    });
    return !!orderItem;
  }

  private async findOrThrow(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }
}
