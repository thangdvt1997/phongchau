import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { ImageType } from '@prisma/client';

export class UploadProductImageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ enum: ImageType, required: false, default: ImageType.GALLERY })
  @IsOptional()
  @IsEnum(ImageType)
  type?: ImageType;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  position?: number;
}
