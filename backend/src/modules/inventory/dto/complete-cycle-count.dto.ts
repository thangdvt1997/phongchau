import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CompleteCycleCountDto {
  @ApiProperty({ description: 'The physically counted quantity' })
  @IsInt()
  @Min(0)
  actualQuantity!: number;
}
