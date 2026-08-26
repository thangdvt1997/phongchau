import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddTicketMessageDto } from './dto/add-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Guest-friendly, like guest checkout (see OrdersController#checkout /
  // OptionalJwtAuthGuard) — a logged-in user's ticket is tied to their account,
  // a guest must supply guestEmail/guestName in the body instead.
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser | null, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(dto, {
      userId: user?.id,
      guestEmail: dto.guestEmail,
      guestName: dto.guestName,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.supportService.listForUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.supportService.getTicketForUser(id, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  async addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
  ) {
    // Ownership check first (404s if this isn't the caller's ticket) — otherwise any
    // authenticated user could post into another user's ticket by guessing its id.
    await this.supportService.getTicketForUser(id, user.id);
    return this.supportService.addMessage(id, user.id, false, dto);
  }
}
