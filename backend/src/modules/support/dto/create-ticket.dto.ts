import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiProperty({ enum: TicketCategory, required: false })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiProperty({ enum: TicketPriority, required: false })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ required: false, description: 'Link the ticket to one of the caller\'s own orders' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ required: false, description: 'Required when opening a ticket as a guest (no account)' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guestName?: string;
}
