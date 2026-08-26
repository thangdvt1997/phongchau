import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { QueryBlogDto } from './dto/query-blog.dto';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('blogs')
  findPublished(@Query() query: QueryBlogDto) {
    return this.cmsService.findPublished(query);
  }

  @Get('blogs/:slug')
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.cmsService.findPublishedBySlug(slug);
  }
}
