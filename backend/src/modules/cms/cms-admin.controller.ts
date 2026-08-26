import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryAdminBlogDto } from './dto/query-admin-blog.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Role } from '@prisma/client';

@ApiTags('admin/cms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MARKETING_SEO)
@Controller('admin/cms')
export class CmsAdminController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('blogs')
  findAll(@Query() query: QueryAdminBlogDto) {
    return this.cmsService.adminFindAll(query);
  }

  @Get('blogs/:id')
  findOne(@Param('id') id: string) {
    return this.cmsService.adminFindOne(id);
  }

  @Post('blogs')
  create(@Body() dto: CreateBlogDto, @CurrentUser() user: AuthenticatedUser) {
    return this.cmsService.adminCreate(dto, user.id);
  }

  @Patch('blogs/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.cmsService.adminUpdate(id, dto);
  }

  @Delete('blogs/:id')
  remove(@Param('id') id: string) {
    return this.cmsService.adminDelete(id);
  }
}
