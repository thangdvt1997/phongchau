import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateProductBatchDto {
  @ApiProperty()
  @IsString()
  batchNumber!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  processingDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  packagingDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qcResult?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  warehouseId?: string;
}
