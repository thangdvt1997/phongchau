import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CompanyStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto';
import { RejectCompanyDto } from './dto/reject-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreatePriceTierDto } from './dto/create-price-tier.dto';
import { CreateCustomerPriceDto } from './dto/create-customer-price.dto';

@Injectable()
export class B2bAdminService {
  private readonly logger = new Logger(B2bAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- Company approval ----------

  async listCompanies(query: ListCompaniesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [companies, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          users: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      items: companies.map((company) => this.serializeCompany(company)),
      total,
      page,
      pageSize,
    };
  }

  async getCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return this.serializeCompany(company);
  }

  async approveCompany(id: string) {
    await this.findCompanyOrThrow(id);

    const company = await this.prisma.company.update({
      where: { id },
      data: { status: CompanyStatus.APPROVED },
    });

    const primaryUser = await this.prisma.user.findFirst({
      where: { companyId: id },
      orderBy: { createdAt: 'asc' },
    });

    if (primaryUser) {
      try {
        await this.notifications.notify('b2b.approved', {
          userId: primaryUser.id,
          data: { companyName: company.name },
        });
      } catch (error) {
        // A notification failure must never break the approval itself.
        this.logger.warn(`Failed to send b2b.approved notification for company ${id}: ${error}`);
      }
    }

    return this.serializeCompany(company);
  }

  async rejectCompany(id: string, dto: RejectCompanyDto) {
    await this.findCompanyOrThrow(id);

    const company = await this.prisma.company.update({
      where: { id },
      data: { status: CompanyStatus.REJECTED, rejectionReason: dto.reason },
    });

    return this.serializeCompany(company);
  }

  async updateCompany(id: string, dto: UpdateCompanyDto) {
    await this.findCompanyOrThrow(id);

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
      },
    });

    return this.serializeCompany(company);
  }

  // ---------- Tier pricing ----------

  async listPriceTiers(productId: string) {
    const tiers = await this.prisma.priceTier.findMany({
      where: { productId },
      orderBy: { minQty: 'asc' },
    });
    return tiers.map((tier) => ({ ...tier, price: Number(tier.price) }));
  }

  async createPriceTier(productId: string, dto: CreatePriceTierDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    if (dto.maxQty !== undefined && dto.maxQty !== null && dto.maxQty < dto.minQty) {
      throw new BadRequestException('maxQty must be greater than or equal to minQty');
    }

    const existingTiers = await this.prisma.priceTier.findMany({ where: { productId } });
    const newMax = dto.maxQty ?? Infinity;
    const overlaps = existingTiers.some((tier) => {
      const tierMax = tier.maxQty ?? Infinity;
      return dto.minQty <= tierMax && newMax >= tier.minQty;
    });
    if (overlaps) {
      throw new BadRequestException(
        'This price tier range overlaps with an existing tier for this product',
      );
    }

    const tier = await this.prisma.priceTier.create({
      data: {
        productId,
        minQty: dto.minQty,
        maxQty: dto.maxQty ?? null,
        price: dto.price,
        currency: dto.currency,
      },
    });

    return { ...tier, price: Number(tier.price) };
  }

  async deletePriceTier(id: string) {
    const tier = await this.prisma.priceTier.findUnique({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Price tier ${id} not found`);
    }
    await this.prisma.priceTier.delete({ where: { id } });
    return { success: true };
  }

  // ---------- Customer-specific contract pricing ----------

  async listCustomerPrices(companyId: string) {
    const prices = await this.prisma.customerPrice.findMany({ where: { companyId } });
    return prices.map((price) => ({ ...price, price: Number(price.price) }));
  }

  async upsertCustomerPrice(companyId: string, dto: CreateCustomerPriceDto) {
    await this.findCompanyOrThrow(companyId);
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    const data = {
      price: dto.price,
      currency: dto.currency,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
    };

    const price = await this.prisma.customerPrice.upsert({
      where: { companyId_productId: { companyId, productId: dto.productId } },
      create: { companyId, productId: dto.productId, ...data },
      update: data,
    });

    return { ...price, price: Number(price.price) };
  }

  async deleteCustomerPrice(id: string) {
    const price = await this.prisma.customerPrice.findUnique({ where: { id } });
    if (!price) {
      throw new NotFoundException(`Customer price ${id} not found`);
    }
    await this.prisma.customerPrice.delete({ where: { id } });
    return { success: true };
  }

  // ---------- helpers ----------

  private async findCompanyOrThrow(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return company;
  }

  // Generic (rather than `Record<string, unknown>`) so the spread below keeps every field
  // of whatever shape is passed in — a plain `Record<string, unknown>` parameter loses all
  // named properties on spread, collapsing the return type down to just `{ creditLimit }`.
  private serializeCompany<T extends { creditLimit: unknown }>(company: T) {
    return {
      ...company,
      creditLimit:
        company.creditLimit !== null && company.creditLimit !== undefined
          ? Number(company.creditLimit)
          : null,
    };
  }
}
