import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type AdjustInventoryType = 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'EXPIRE';

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

  @ApiProperty({ enum: ['IN', 'OUT', 'ADJUST', 'DAMAGE', 'EXPIRE'] })
  @IsIn(['IN', 'OUT', 'ADJUST', 'DAMAGE', 'EXPIRE'])
  type!: AdjustInventoryType;

  // Required (enforced in InventoryService.adjust) when type is DAMAGE/EXPIRE — a
  // write-off needs a recorded reason. Optional for IN/OUT/ADJUST, matching prior behavior.
  @ApiProperty({ required: false, description: 'Reason/reference; required for DAMAGE and EXPIRE' })
  @IsOptional()
  @IsString()
  reference?: string;
}
