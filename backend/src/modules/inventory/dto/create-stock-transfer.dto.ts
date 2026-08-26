import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStockTransferDto {
  @ApiProperty()
  @IsString()
  productVariantId!: string;

  @ApiProperty()
  @IsString()
  fromWarehouseId!: string;

  @ApiProperty()
  @IsString()
  toWarehouseId!: string;

  @ApiProperty({ description: 'Quantity to transfer; must be a positive integer' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
