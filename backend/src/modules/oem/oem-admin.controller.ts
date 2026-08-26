import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OemService } from './oem.service';
import { AdminOemQueryDto } from './dto/admin-oem-query.dto';
import { UpdateOemStatusDto } from './dto/update-oem-status.dto';
import { UpdateOemDto } from './dto/update-oem.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '@prisma/client';

@ApiTags('oem')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SALES)
@Controller('admin/oem')
export class OemAdminController {
  constructor(private readonly oemService: OemService) {}

  @Get()
  findAll(@Query() query: AdminOemQueryDto) {
    return this.oemService.adminList(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.oemService.adminGetOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOemStatusDto,
  ) {
    return this.oemService.adminUpdateStatus(id, dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOemDto) {
    return this.oemService.adminUpdate(id, dto);
  }
}
