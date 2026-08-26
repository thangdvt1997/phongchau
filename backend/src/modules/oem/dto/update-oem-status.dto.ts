import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OemRequestStatus } from '@prisma/client';

export class UpdateOemStatusDto {
  @ApiProperty({ enum: OemRequestStatus })
  @IsEnum(OemRequestStatus)
  status!: OemRequestStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
