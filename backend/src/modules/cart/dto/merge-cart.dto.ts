import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MergeCartDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;
}
