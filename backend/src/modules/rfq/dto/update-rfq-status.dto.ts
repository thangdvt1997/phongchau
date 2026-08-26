import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RfqStatus } from '@prisma/client';

export class UpdateRfqStatusDto {
  @ApiProperty({ enum: RfqStatus })
  @IsEnum(RfqStatus)
  status!: RfqStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
