import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  // Nullable so the assignee <select> can send `null` to unassign; IsOptional skips
  // validation for both undefined (field omitted — leave assigneeId untouched) and
  // null (explicit unassign), IsUUID only runs when a real id is supplied.
  @ApiPropertyOptional({ nullable: true, description: 'Staff user id, or null to unassign' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}
