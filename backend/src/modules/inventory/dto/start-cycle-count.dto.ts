import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StartCycleCountDto {
  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty()
  @IsString()
  productVariantId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
