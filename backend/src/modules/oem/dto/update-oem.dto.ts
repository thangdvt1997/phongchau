import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  internalNote?: string;
}
