import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export type ProductSort = 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'rating';

const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
};

export class ProductQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @ApiProperty({ required: false, description: 'Matches ProductVariant.packagingLabel' })
  @IsOptional()
  @IsString()
  packaging?: string;

  @ApiProperty({ required: false, description: 'Matches Product.moq (contains)' })
  @IsOptional()
  @IsString()
  moq?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isOrganic?: boolean;

  @ApiProperty({ required: false, description: 'Homepage "Featured Products" flag' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false, description: 'At least one variant has available inventory > 0' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  inStock?: boolean;

  @ApiProperty({ required: false, description: 'Free-text search across name/sku/shortDescription' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    required: false,
    enum: ['popular', 'newest', 'price_asc', 'price_desc', 'rating'],
    default: 'newest',
  })
  @IsOptional()
  @IsIn(['popular', 'newest', 'price_asc', 'price_desc', 'rating'])
  sort?: ProductSort = 'newest';
}
