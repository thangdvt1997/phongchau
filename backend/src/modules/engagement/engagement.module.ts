import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReviewsController } from './reviews.controller';
import { ReviewsAdminController } from './reviews-admin.controller';
import { ReviewsService } from './reviews.service';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  controllers: [ReviewsController, ReviewsAdminController, WishlistController],
  providers: [ReviewsService, WishlistService, RolesGuard],
  exports: [ReviewsService, WishlistService],
})
export class EngagementModule {}
