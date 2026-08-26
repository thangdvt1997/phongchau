import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { B2bAdminService } from './b2b-admin.service';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto';
import { RejectCompanyDto } from './dto/reject-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreatePriceTierDto } from './dto/create-price-tier.dto';
import { CreateCustomerPriceDto } from './dto/create-customer-price.dto';

@ApiTags('b2b')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('admin/b2b')
export class B2bAdminController {
  constructor(private readonly b2bAdminService: B2bAdminService) {}

  @Get('companies')
  listCompanies(@Query() query: ListCompaniesQueryDto) {
    return this.b2bAdminService.listCompanies(query);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.b2bAdminService.getCompany(id);
  }

  @Post('companies/:id/approve')
  approveCompany(@Param('id') id: string) {
    return this.b2bAdminService.approveCompany(id);
  }

  @Post('companies/:id/reject')
  rejectCompany(@Param('id') id: string, @Body() dto: RejectCompanyDto) {
    return this.b2bAdminService.rejectCompany(id, dto);
  }

  @Patch('companies/:id')
  updateCompany(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.b2bAdminService.updateCompany(id, dto);
  }

  @Get('products/:productId/price-tiers')
  listPriceTiers(@Param('productId') productId: string) {
    return this.b2bAdminService.listPriceTiers(productId);
  }

  @Post('products/:productId/price-tiers')
  createPriceTier(@Param('productId') productId: string, @Body() dto: CreatePriceTierDto) {
    return this.b2bAdminService.createPriceTier(productId, dto);
  }

  @Delete('price-tiers/:id')
  deletePriceTier(@Param('id') id: string) {
    return this.b2bAdminService.deletePriceTier(id);
  }

  @Get('companies/:companyId/customer-prices')
  listCustomerPrices(@Param('companyId') companyId: string) {
    return this.b2bAdminService.listCustomerPrices(companyId);
  }

  @Post('companies/:companyId/customer-prices')
  upsertCustomerPrice(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCustomerPriceDto,
  ) {
    return this.b2bAdminService.upsertCustomerPrice(companyId, dto);
  }

  @Delete('customer-prices/:id')
  deleteCustomerPrice(@Param('id') id: string) {
    return this.b2bAdminService.deleteCustomerPrice(id);
  }
}
