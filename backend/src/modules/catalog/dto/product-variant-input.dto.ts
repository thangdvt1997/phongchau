import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Nested variant payload used inside CreateProductDto/UpdateProductDto.
 * When `id` is present and matches an existing variant on the product, it is
 * updated in place; otherwise a new variant is created. Existing variants not
 * referenced by id in the array are deleted (see ProductsService.syncVariants).
 */
export class ProductVariantInputDto {
  @ApiProperty({ required: false, description: 'Existing variant id — omit to create a new variant' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weightLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packagingLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gradeLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  processingLabel?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
