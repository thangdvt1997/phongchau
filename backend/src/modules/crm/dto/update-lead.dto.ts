import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  // Nullable so a card's assignee <select> can send `null` to unassign; IsOptional
  // skips validation for both undefined (field omitted — leave assigneeId untouched)
  // and null (explicit unassign), IsUUID only runs when a real id is supplied.
  @ApiPropertyOptional({ nullable: true, description: 'Staff user id, or null to unassign' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}
