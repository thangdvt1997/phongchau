import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { generateUniqueSlug } from './utils/slug.util';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { CreateOriginDto, UpdateOriginDto } from './dto/origin.dto';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/certification.dto';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  imageUrl: string | null;
  position: number;
  children: CategoryNode[];
}

/**
 * Handles the "simple" lookup entities of the catalog: Category, Brand,
 * Origin, Certification. Product/variant/image/document/batch logic lives in
 * ProductsService — it's large enough to warrant its own file.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Categories ----------

  async getCategoryTree(): Promise<CategoryNode[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { position: 'asc' },
    });

    const byId = new Map<string, CategoryNode>();
    for (const cat of categories) {
      byId.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        description: cat.description,
        imageUrl: cat.imageUrl,
        position: cat.position,
        children: [],
      });
    }

    const roots: CategoryNode[] = [];
    for (const cat of categories) {
      const node = byId.get(cat.id)!;
      if (cat.parentId && byId.has(cat.parentId)) {
        byId.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async listCategoriesFlat() {
    return this.prisma.category.findMany({ orderBy: { position: 'asc' } });
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = await this.resolveSlug(dto.slug ?? dto.name, (s) =>
      this.prisma.category.findUnique({ where: { slug: s } }),
    );
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId,
        description: dto.description,
        imageUrl: dto.imageUrl,
        position: dto.position ?? 0,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        canonicalUrl: dto.canonicalUrl,
        ogImage: dto.ogImage,
        noIndex: dto.noIndex ?? false,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategoryById(id);
    const slug = dto.slug
      ? await this.resolveSlug(dto.slug, (s) => this.prisma.category.findUnique({ where: { slug: s } }), id)
      : undefined;
    return this.prisma.category.update({
      where: { id },
      data: { ...dto, slug },
    });
  }

  async deleteCategory(id: string) {
    await this.getCategoryById(id);
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new BadRequestException('Cannot delete a category that still has products');
    }
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  // ---------- Brands ----------

  async listBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async getBrandById(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async createBrand(dto: CreateBrandDto) {
    const slug = await this.resolveSlug(dto.slug ?? dto.name, (s) =>
      this.prisma.brand.findUnique({ where: { slug: s } }),
    );
    return this.prisma.brand.create({ data: { name: dto.name, slug, logoUrl: dto.logoUrl } });
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    await this.getBrandById(id);
    const slug = dto.slug
      ? await this.resolveSlug(dto.slug, (s) => this.prisma.brand.findUnique({ where: { slug: s } }), id)
      : undefined;
    return this.prisma.brand.update({ where: { id }, data: { ...dto, slug } });
  }

  async deleteBrand(id: string) {
    await this.getBrandById(id);
    await this.prisma.brand.delete({ where: { id } });
    return { success: true };
  }

  // ---------- Origins ----------

  async listOrigins() {
    return this.prisma.origin.findMany({ orderBy: { name: 'asc' } });
  }

  async getOriginById(id: string) {
    const origin = await this.prisma.origin.findUnique({ where: { id } });
    if (!origin) throw new NotFoundException('Origin not found');
    return origin;
  }

  async createOrigin(dto: CreateOriginDto) {
    return this.prisma.origin.create({ data: { ...dto } });
  }

  async updateOrigin(id: string, dto: UpdateOriginDto) {
    await this.getOriginById(id);
    return this.prisma.origin.update({ where: { id }, data: { ...dto } });
  }

  async deleteOrigin(id: string) {
    await this.getOriginById(id);
    await this.prisma.origin.delete({ where: { id } });
    return { success: true };
  }

  // ---------- Certifications ----------

  async listCertifications() {
    return this.prisma.certification.findMany({ orderBy: { name: 'asc' } });
  }

  async getCertificationById(id: string) {
    const certification = await this.prisma.certification.findUnique({ where: { id } });
    if (!certification) throw new NotFoundException('Certification not found');
    return certification;
  }

  async createCertification(dto: CreateCertificationDto) {
    return this.prisma.certification.create({ data: { ...dto } });
  }

  async updateCertification(id: string, dto: UpdateCertificationDto) {
    await this.getCertificationById(id);
    return this.prisma.certification.update({ where: { id }, data: { ...dto } });
  }

  async deleteCertification(id: string) {
    await this.getCertificationById(id);
    await this.prisma.certification.delete({ where: { id } });
    return { success: true };
  }

  // ---------- shared ----------

  private async resolveSlug(
    seed: string,
    findBySlug: (slug: string) => Promise<{ id: string } | null>,
    excludeId?: string,
  ): Promise<string> {
    return generateUniqueSlug(seed, async (candidate) => {
      const existing = await findBySlug(candidate);
      return !!existing && existing.id !== excludeId;
    });
  }
}
