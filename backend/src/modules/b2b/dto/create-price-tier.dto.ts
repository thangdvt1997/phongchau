import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePriceTierDto {
  @ApiProperty({ description: 'Minimum quantity (inclusive) for this tier to apply' })
  @IsInt()
  @Min(0)
  minQty!: number;

  @ApiPropertyOptional({ description: 'Maximum quantity (inclusive). Omit for "and above".' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxQty?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsString()
  currency!: string;
}
