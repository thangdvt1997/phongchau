import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { LeadActivityType } from '@prisma/client';

export class AddLeadActivityDto {
  @ApiProperty({ enum: LeadActivityType })
  @IsEnum(LeadActivityType)
  type!: LeadActivityType;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiProperty({ required: false, description: 'ISO date string — due date for a TASK activity' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
