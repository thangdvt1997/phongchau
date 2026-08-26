import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class B2bService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCompany(companyId: string | null | undefined) {
    if (!companyId) {
      throw new NotFoundException('Your account is not associated with a company');
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      ...company,
      creditLimit:
        company.creditLimit !== null && company.creditLimit !== undefined
          ? Number(company.creditLimit)
          : null,
    };
  }
}
