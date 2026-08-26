import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { RfqQueryDto } from './dto/rfq-query.dto';
import { PostRfqMessageDto } from './dto/post-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('rfq')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRfqDto) {
    return this.rfqService.create(user, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: RfqQueryDto) {
    return this.rfqService.findMine(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.findOne(id, user);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rfqService.submit(id, user);
  }

  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PostRfqMessageDto,
  ) {
    return this.rfqService.addMessage(id, user, dto);
  }

  @Post(':id/quotations/:quotationId/accept')
  acceptQuotation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('quotationId') quotationId: string,
  ) {
    return this.rfqService.acceptQuotation(id, quotationId, user);
  }

  @Post(':id/quotations/:quotationId/reject')
  rejectQuotation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('quotationId') quotationId: string,
  ) {
    return this.rfqService.rejectQuotation(id, quotationId, user);
  }
}
