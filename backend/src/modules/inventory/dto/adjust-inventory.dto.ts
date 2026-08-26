import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type AdjustInventoryType = 'IN' | 'OUT' | 'ADJUST';

export class AdjustInventoryDto {
  @ApiProperty()
  @IsString()
  productVariantId!: string;

  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty({ description: 'Quantity to move; must be a positive integer' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: ['IN', 'OUT', 'ADJUST'] })
  @IsIn(['IN', 'OUT', 'ADJUST'])
  type!: AdjustInventoryType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}
