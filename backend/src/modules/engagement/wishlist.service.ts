import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    const wishlists = await this.prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            currency: true,
            images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
          },
        },
      },
    });

    return wishlists.map((wishlist) => ({
      id: wishlist.id,
      productId: wishlist.productId,
      createdAt: wishlist.createdAt,
      product: {
        id: wishlist.product.id,
        name: wishlist.product.name,
        slug: wishlist.product.slug,
        basePrice: Number(wishlist.product.basePrice),
        currency: wishlist.product.currency,
        imageUrl: wishlist.product.images[0]?.url ?? null,
      },
    }));
  }

  async add(userId: string, dto: AddWishlistItemDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Idempotent: if this [userId, productId] pair already exists, just return it.
    return this.prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId: dto.productId } },
      create: { userId, productId: dto.productId },
      update: {},
    });
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, productId } });
    return { success: true };
  }
}
