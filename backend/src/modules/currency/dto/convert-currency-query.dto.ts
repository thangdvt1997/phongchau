import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, Matches, Min } from 'class-validator';

export class ConvertCurrencyQueryDto {
  @ApiProperty({ minimum: 0.01, description: 'Amount in VND to convert' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: '3-letter target currency code, e.g. "USD"' })
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, { message: 'target must be a 3-letter currency code' })
  target!: string;
}
