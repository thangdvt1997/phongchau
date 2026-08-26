import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { ProductVariantInputDto } from './product-variant-input.dto';

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ enum: ProductStatus, required: false })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  scientificName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  harvestSeason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  farmingMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  moisture?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shelfLife?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  storageTemperature?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOrganic?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hsCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  moq?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productionCapacity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplyAbility?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  leadTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  portOfLoading?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incoterms?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  netWeight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  grossWeight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitsPerCarton?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cartonsPerPallet?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  container20ftCapacity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  container40ftCapacity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  container40hqCapacity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiProperty({ required: false, type: [ProductVariantInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];

  @ApiProperty({ required: false, type: [String], description: 'Full replacement of attached certification ids' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  certificationIds?: string[];
}
