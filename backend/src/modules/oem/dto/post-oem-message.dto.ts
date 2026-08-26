import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class PostOemMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
