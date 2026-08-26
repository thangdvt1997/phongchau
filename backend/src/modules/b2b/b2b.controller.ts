import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { B2bService } from './b2b.service';

@ApiTags('b2b')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) {}

  @Get('company/me')
  getMyCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.b2bService.getMyCompany(user.companyId);
  }
}
