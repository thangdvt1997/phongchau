import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class OrderNotesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  internalNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerNote?: string;
}
