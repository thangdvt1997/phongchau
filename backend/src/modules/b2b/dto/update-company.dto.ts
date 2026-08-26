import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Credit limit extended to this company' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Free-text payment terms, e.g. Net 7 / Net 15 / Net 30 / L/C / T/T / 30/70',
  })
  @IsOptional()
  @IsString()
  paymentTerms?: string;
}
