import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class UpsertRateDto {
  @ApiProperty({
    minimum: 0.00000001,
    description: 'Units of target currency that equal 1 VND (e.g. 0.000039 for USD)',
  })
  @IsNumber()
  @IsPositive()
  rate!: number;
}
