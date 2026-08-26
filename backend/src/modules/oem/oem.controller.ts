import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OemService } from './oem.service';
import { CreateOemDto } from './dto/create-oem.dto';
import { OemQueryDto } from './dto/oem-query.dto';
import { PostOemMessageDto } from './dto/post-oem-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('oem')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('oem')
export class OemController {
  constructor(private readonly oemService: OemService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOemDto) {
    return this.oemService.create(user, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: OemQueryDto) {
    return this.oemService.findMine(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.oemService.findOne(id, user);
  }

  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PostOemMessageDto,
  ) {
    return this.oemService.addMessage(id, user, dto);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.oemService.cancel(id, user);
  }
}
