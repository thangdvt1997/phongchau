import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BlogCategory, ContentStatus } from '@prisma/client';

export class CreateBlogDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false, description: 'Auto-generated from title via slugify when omitted' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ enum: BlogCategory, required: false, default: BlogCategory.BLOG })
  @IsOptional()
  @IsEnum(BlogCategory)
  category?: BlogCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ enum: ContentStatus, required: false, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

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

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;
}
