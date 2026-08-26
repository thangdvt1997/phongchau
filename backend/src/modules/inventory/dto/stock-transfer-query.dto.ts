import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StockTransferStatus } from '@prisma/client';

export class StockTransferQueryDto {
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

  @ApiProperty({ required: false, description: 'Matches transfers where this is either the from or to warehouse' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiProperty({ required: false, enum: StockTransferStatus })
  @IsOptional()
  @IsIn(Object.values(StockTransferStatus))
  status?: StockTransferStatus;
}
