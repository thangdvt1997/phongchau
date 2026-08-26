import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  productType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recipe?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetMarket?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packageType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packageSize?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrivateLabel?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  estimatedQuantity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificationRequirement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetPrice?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
