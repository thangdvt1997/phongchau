import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CycleCountService } from './cycle-count.service';
import { StartCycleCountDto } from './dto/start-cycle-count.dto';
import { CompleteCycleCountDto } from './dto/complete-cycle-count.dto';
import { CycleCountQueryDto } from './dto/cycle-count-query.dto';

@ApiTags('admin/inventory/cycle-counts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.WAREHOUSE_STAFF)
@Controller('admin/inventory/cycle-counts')
export class CycleCountController {
  constructor(private readonly cycleCountService: CycleCountService) {}

  @Post()
  start(@Body() dto: StartCycleCountDto) {
    return this.cycleCountService.start(dto);
  }

  @Get()
  list(@Query() query: CycleCountQueryDto) {
    return this.cycleCountService.list(query);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteCycleCountDto,
  ) {
    return this.cycleCountService.complete(id, dto, user.id);
  }
}
