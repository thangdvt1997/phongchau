import {
  PrismaClient,
  Role,
  BusinessType,
  CompanyStatus,
  ProductStatus,
  DocumentType,
  CouponType,
  ContentStatus,
  BlogCategory,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Seeding Phong Chau demo data...');

  // ---------- Warehouses ----------
  const whHcm = await prisma.warehouse.upsert({
    where: { code: 'WH-HCM' },
    update: {},
    create: { name: 'Ho Chi Minh Main Warehouse', code: 'WH-HCM', address: 'Binh Chanh, Ho Chi Minh City', isDefault: true },
  });
  const whDaNang = await prisma.warehouse.upsert({
    where: { code: 'WH-DN' },
    update: {},
    create: { name: 'Da Nang Regional Warehouse', code: 'WH-DN', address: 'Hoa Vang, Da Nang' },
  });

  // ---------- Certifications ----------
  const certData = [
    { code: 'HACCP', name: 'HACCP' },
    { code: 'ISO22000', name: 'ISO 22000' },
    { code: 'GLOBALGAP', name: 'GlobalG.A.P' },
    { code: 'ORGANIC', name: 'Organic' },
    { code: 'BRC', name: 'BRC' },
    { code: 'HALAL', name: 'Halal' },
    { code: 'FDA', name: 'FDA' },
    { code: 'VIETGAP', name: 'VietGAP' },
  ];
  const certs: Record<string, { id: string }> = {};
  for (const c of certData) {
    certs[c.code] = await prisma.certification.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // ---------- Origins ----------
  const originData = [
    { key: 'daklak', name: 'Dak Lak Highlands', country: 'Vietnam', province: 'Dak Lak', farmName: 'Dak Lak Coffee Cooperative' },
    { key: 'binhphuoc', name: 'Binh Phuoc Cashew Region', country: 'Vietnam', province: 'Binh Phuoc', farmName: 'Binh Phuoc Cashew Farms' },
    { key: 'phuquoc', name: 'Phu Quoc Pepper Fields', country: 'Vietnam', province: 'Kien Giang', farmName: 'Phu Quoc Pepper Cooperative' },
    { key: 'bentre', name: 'Ben Tre Coconut Delta', country: 'Vietnam', province: 'Ben Tre', farmName: 'Ben Tre Coconut Farms' },
    { key: 'angiang', name: 'An Giang Rice Fields', country: 'Vietnam', province: 'An Giang', farmName: 'An Giang Rice Cooperative' },
  ];
  const origins: Record<string, { id: string }> = {};
  for (const { key, ...o } of originData) {
    const existing = await prisma.origin.findFirst({ where: { name: o.name } });
    origins[key] = existing ?? (await prisma.origin.create({ data: o }));
  }

  // ---------- Brand ----------
  const brand = await prisma.brand.upsert({
    where: { slug: 'phong-chau-premium' },
    update: {},
    create: { name: 'Phong Chau Premium', slug: 'phong-chau-premium' },
  });

  // ---------- Categories ----------
  async function upsertCategory(name: string, slug: string, parentId?: string) {
    return prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, parentId },
    });
  }

  const catNuts = await upsertCategory('Nuts', 'nuts');
  const catSpices = await upsertCategory('Spices', 'spices');
  const catCoffee = await upsertCategory('Coffee', 'coffee');
  const catRice = await upsertCategory('Rice & Grains', 'rice-grains');
  const catCoconut = await upsertCategory('Coconut Products', 'coconut-products');
  const catCashew = await upsertCategory('Cashew', 'cashew', catNuts.id);
  const catPepper = await upsertCategory('Pepper', 'pepper', catSpices.id);
  await upsertCategory('Fresh Agricultural Products', 'fresh-agricultural-products');
  await upsertCategory('Processed Products', 'processed-products');
  await upsertCategory('Frozen Products', 'frozen-products');
  await upsertCategory('Dried Products', 'dried-products');

  // ---------- Products ----------
  interface SeedProduct {
    sku: string;
    name: string;
    slug: string;
    categoryId: string;
    originId: string;
    certCodes: string[];
    basePrice: number;
    variants: { sku: string; weightLabel: string; packagingLabel: string; gradeLabel: string; price: number }[];
    moq: string;
    hsCode: string;
  }

  const products: SeedProduct[] = [
    {
      sku: 'CASHEW-W320',
      name: 'Vietnam Roasted Cashew Nut W320',
      slug: 'vietnam-roasted-cashew-w320',
      categoryId: catCashew.id,
      originId: origins.binhphuoc.id,
      certCodes: ['HACCP', 'ISO22000', 'GLOBALGAP'],
      basePrice: 220000,
      moq: '1 x 20FT container',
      hsCode: '0801.32',
      variants: [
        { sku: 'CASHEW-W320-500G', weightLabel: '500g', packagingLabel: 'Vacuum Bag', gradeLabel: 'W320', price: 120000 },
        { sku: 'CASHEW-W320-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'W320', price: 5200000 },
      ],
    },
    {
      sku: 'CASHEW-W240',
      name: 'Vietnam Raw Cashew Nut W240',
      slug: 'vietnam-raw-cashew-w240',
      categoryId: catCashew.id,
      originId: origins.binhphuoc.id,
      certCodes: ['HACCP', 'ORGANIC'],
      basePrice: 250000,
      moq: '1 x 20FT container',
      hsCode: '0801.32',
      variants: [
        { sku: 'CASHEW-W240-1KG', weightLabel: '1kg', packagingLabel: 'Vacuum Bag', gradeLabel: 'W240', price: 250000 },
        { sku: 'CASHEW-W240-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'W240', price: 6000000 },
      ],
    },
    {
      sku: 'COFFEE-ROBUSTA',
      name: 'Dak Lak Roasted Robusta Coffee Beans',
      slug: 'dak-lak-roasted-robusta-coffee',
      categoryId: catCoffee.id,
      originId: origins.daklak.id,
      certCodes: ['ISO22000', 'VIETGAP'],
      basePrice: 95000,
      moq: '500kg',
      hsCode: '0901.21',
      variants: [
        { sku: 'COFFEE-ROBUSTA-500G', weightLabel: '500g', packagingLabel: 'Bag', gradeLabel: 'Grade 1', price: 95000 },
        { sku: 'COFFEE-ROBUSTA-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Grade 1', price: 4300000 },
      ],
    },
    {
      sku: 'COFFEE-ARABICA',
      name: 'Dak Lak Washed Arabica Coffee Beans',
      slug: 'dak-lak-washed-arabica-coffee',
      categoryId: catCoffee.id,
      originId: origins.daklak.id,
      certCodes: ['ORGANIC', 'FDA'],
      basePrice: 145000,
      moq: '500kg',
      hsCode: '0901.11',
      variants: [
        { sku: 'COFFEE-ARABICA-500G', weightLabel: '500g', packagingLabel: 'Bag', gradeLabel: 'Specialty', price: 145000 },
        { sku: 'COFFEE-ARABICA-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Specialty', price: 6800000 },
      ],
    },
    {
      sku: 'PEPPER-BLACK',
      name: 'Phu Quoc Black Pepper',
      slug: 'phu-quoc-black-pepper',
      categoryId: catPepper.id,
      originId: origins.phuquoc.id,
      certCodes: ['HACCP', 'BRC', 'HALAL'],
      basePrice: 180000,
      moq: '1 tonne',
      hsCode: '0904.11',
      variants: [
        { sku: 'PEPPER-BLACK-250G', weightLabel: '250g', packagingLabel: 'Jar', gradeLabel: 'Grade A', price: 60000 },
        { sku: 'PEPPER-BLACK-25KG', weightLabel: '25kg', packagingLabel: 'Bag', gradeLabel: 'Grade A', price: 4500000 },
      ],
    },
    {
      sku: 'PEPPER-WHITE',
      name: 'Phu Quoc White Pepper',
      slug: 'phu-quoc-white-pepper',
      categoryId: catPepper.id,
      originId: origins.phuquoc.id,
      certCodes: ['HACCP', 'HALAL'],
      basePrice: 220000,
      moq: '1 tonne',
      hsCode: '0904.12',
      variants: [
        { sku: 'PEPPER-WHITE-250G', weightLabel: '250g', packagingLabel: 'Jar', gradeLabel: 'Premium', price: 75000 },
        { sku: 'PEPPER-WHITE-25KG', weightLabel: '25kg', packagingLabel: 'Bag', gradeLabel: 'Premium', price: 5500000 },
      ],
    },
    {
      sku: 'RICE-JASMINE',
      name: 'An Giang Jasmine Rice',
      slug: 'an-giang-jasmine-rice',
      categoryId: catRice.id,
      originId: origins.angiang.id,
      certCodes: ['VIETGAP', 'ISO22000'],
      basePrice: 22000,
      moq: '20 tonnes',
      hsCode: '1006.30',
      variants: [
        { sku: 'RICE-JASMINE-5KG', weightLabel: '5kg', packagingLabel: 'Bag', gradeLabel: '5% Broken', price: 110000 },
        { sku: 'RICE-JASMINE-50KG', weightLabel: '50kg', packagingLabel: 'Bag', gradeLabel: '5% Broken', price: 1050000 },
      ],
    },
    {
      sku: 'COCONUT-DRIED',
      name: 'Ben Tre Desiccated Coconut',
      slug: 'ben-tre-desiccated-coconut',
      categoryId: catCoconut.id,
      originId: origins.bentre.id,
      certCodes: ['HACCP', 'ORGANIC'],
      basePrice: 65000,
      moq: '1 x 20FT container',
      hsCode: '0801.11',
      variants: [
        { sku: 'COCONUT-DRIED-1KG', weightLabel: '1kg', packagingLabel: 'Vacuum Bag', gradeLabel: 'Fine', price: 65000 },
        { sku: 'COCONUT-DRIED-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Fine', price: 1500000 },
      ],
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        status: ProductStatus.ACTIVE,
        categoryId: p.categoryId,
        brandId: brand.id,
        originId: p.originId,
        shortDescription: `Premium ${p.name} sourced directly from Vietnamese farms, export-ready.`,
        fullDescription: `${p.name} produced under strict quality control from origin to packaging, meeting international export standards. Suitable for wholesale, retail, and OEM/ODM private-label programs.`,
        countryOfOrigin: 'Vietnam',
        moq: p.moq,
        hsCode: p.hsCode,
        supplyAbility: '500 tonnes / year',
        leadTime: '15-20 days',
        portOfLoading: 'Cat Lai Port, Ho Chi Minh City',
        incoterms: ['FOB', 'CIF', 'EXW'],
        isOrganic: p.certCodes.includes('ORGANIC'),
        isFeatured: Math.random() > 0.5,
        basePrice: p.basePrice,
        currency: 'VND',
        seoTitle: `${p.name} | Phong Chau Export`,
        seoDescription: `Buy ${p.name} wholesale or for export. MOQ ${p.moq}. Certifications: ${p.certCodes.join(', ')}.`,
        images: {
          create: [
            { url: `https://picsum.photos/seed/${p.sku}-1/800/800`, position: 0, type: 'GALLERY' },
            { url: `https://picsum.photos/seed/${p.sku}-2/800/800`, position: 1, type: 'GALLERY' },
          ],
        },
        documents: {
          create: [
            {
              title: `${p.name} - Specification Sheet`,
              type: DocumentType.SPECIFICATION,
              fileUrl: `https://example.com/docs/${p.sku}-spec.pdf`,
            },
          ],
        },
        certifications: {
          create: p.certCodes.map((code) => ({ certificationId: certs[code].id })),
        },
        variants: {
          create: p.variants.map((v, idx) => ({
            sku: v.sku,
            weightLabel: v.weightLabel,
            packagingLabel: v.packagingLabel,
            gradeLabel: v.gradeLabel,
            price: v.price,
            isDefault: idx === 0,
          })),
        },
      },
      include: { variants: true },
    });

    // Inventory in both warehouses for every variant.
    for (const variant of product.variants) {
      await prisma.inventory.upsert({
        where: {
          productVariantId_warehouseId_batchId: {
            productVariantId: variant.id,
            warehouseId: whHcm.id,
            batchId: null as unknown as string,
          },
        },
        update: {},
        create: {
          productVariantId: variant.id,
          warehouseId: whHcm.id,
          quantityOnHand: 500,
          lowStockThreshold: 20,
        },
      }).catch(async () => {
        // Prisma's compound unique with a null batchId can fail to match on some engines;
        // fall back to a plain find-or-create.
        const existing = await prisma.inventory.findFirst({
          where: { productVariantId: variant.id, warehouseId: whHcm.id, batchId: null },
        });
        if (!existing) {
          await prisma.inventory.create({
            data: { productVariantId: variant.id, warehouseId: whHcm.id, quantityOnHand: 500, lowStockThreshold: 20 },
          });
        }
      });
    }

    // One traceability batch per product.
    const batchNumber = `LOT-2026-${p.sku}`;
    const existingBatch = await prisma.productBatch.findUnique({ where: { batchNumber } });
    if (!existingBatch) {
      await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber,
          originId: p.originId,
          harvestDate: new Date('2026-01-15'),
          processingDate: new Date('2026-01-20'),
          packagingDate: new Date('2026-01-25'),
          expiryDate: new Date('2027-01-25'),
          qcResult: 'Passed - Grade A',
          warehouseId: whHcm.id,
        },
      });
    }

    // Wholesale tier pricing on the first (retail-oriented) variant.
    const firstVariant = product.variants[0];
    const existingTier = await prisma.priceTier.findFirst({ where: { productId: product.id } });
    if (!existingTier) {
      await prisma.priceTier.createMany({
        data: [
          { productId: product.id, minQty: 100, maxQty: 499, price: Number(firstVariant.price) * 0.9, currency: 'VND' },
          { productId: product.id, minQty: 500, maxQty: null, price: Number(firstVariant.price) * 0.8, currency: 'VND' },
        ],
      });
    }
  }

  // Second warehouse gets partial stock on a subset of variants (Da Nang covers central/north).
  const someVariants = await prisma.productVariant.findMany({ take: 6 });
  for (const v of someVariants) {
    const existing = await prisma.inventory.findFirst({
      where: { productVariantId: v.id, warehouseId: whDaNang.id, batchId: null },
    });
    if (!existing) {
      await prisma.inventory.create({
        data: { productVariantId: v.id, warehouseId: whDaNang.id, quantityOnHand: 150, lowStockThreshold: 10 },
      });
    }
  }

  // ---------- Users ----------
  await prisma.user.upsert({
    where: { email: 'admin@phongchau.com' },
    update: {},
    create: {
      email: 'admin@phongchau.com',
      passwordHash: await hash('Admin@12345'),
      fullName: 'Phong Chau Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });
  await prisma.user.upsert({
    where: { email: 'sales@phongchau.com' },
    update: {},
    create: {
      email: 'sales@phongchau.com',
      passwordHash: await hash('Sales@12345'),
      fullName: 'Phong Chau Sales Rep',
      role: Role.SALES,
    },
  });
  await prisma.user.upsert({
    where: { email: 'customer@phongchau.com' },
    update: {},
    create: {
      email: 'customer@phongchau.com',
      passwordHash: await hash('Customer@12345'),
      fullName: 'Nguyen Van A',
      role: Role.RETAIL_CUSTOMER,
    },
  });

  const existingB2bUser = await prisma.user.findUnique({ where: { email: 'b2b@phongchau.com' } });
  if (!existingB2bUser) {
    const company = await prisma.company.create({
      data: {
        name: 'ABC Global Import Co.',
        taxId: 'US-987654321',
        country: 'United States',
        businessType: BusinessType.IMPORTER,
        contactPerson: 'John Smith',
        status: CompanyStatus.APPROVED,
        creditLimit: 50000,
        paymentTerms: 'Net 30',
      },
    });
    await prisma.user.create({
      data: {
        email: 'b2b@phongchau.com',
        passwordHash: await hash('B2bCustomer@12345'),
        fullName: 'John Smith',
        role: Role.B2B_CUSTOMER,
        companyId: company.id,
      },
    });

    const cashew = await prisma.product.findUnique({ where: { slug: 'vietnam-roasted-cashew-w320' } });
    if (cashew) {
      await prisma.customerPrice.upsert({
        where: { companyId_productId: { companyId: company.id, productId: cashew.id } },
        update: {},
        create: { companyId: company.id, productId: cashew.id, price: 100000, currency: 'VND' },
      });
    }
  }

  // ---------- Coupons ----------
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', type: CouponType.PERCENTAGE, value: 10, isActive: true },
  });
  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    update: {},
    create: {
      code: 'FREESHIP',
      type: CouponType.FREE_SHIPPING,
      value: 0,
      minOrderAmount: 2000000,
      isActive: true,
    },
  });

  // ---------- Blog ----------
  const admin = await prisma.user.findUnique({ where: { email: 'admin@phongchau.com' } });
  const blogPosts = [
    {
      slug: 'vietnam-cashew-export-guide-2026',
      title: 'Vietnam Cashew Nuts Exporter: A Buyer’s Guide for 2026',
      category: BlogCategory.EXPORT_GUIDE,
      excerpt: 'Everything international buyers need to know when sourcing cashew nuts from Vietnam.',
    },
    {
      slug: 'wholesale-black-pepper-vietnam',
      title: 'Wholesale Black Pepper Vietnam: Pricing and MOQ Explained',
      category: BlogCategory.MARKET_REPORT,
      excerpt: 'A breakdown of current wholesale pricing tiers and minimum order quantities for Vietnamese black pepper.',
    },
    {
      slug: 'phong-chau-haccp-certification',
      title: 'Phong Chau Achieves HACCP and ISO 22000 Certification',
      category: BlogCategory.COMPANY_NEWS,
      excerpt: 'Our processing facility has been certified to international food safety standards.',
    },
  ];
  for (const post of blogPosts) {
    await prisma.blog.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...post,
        content: `<p>${post.excerpt}</p><p>Full article content coming soon.</p>`,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: admin?.id,
        seoTitle: post.title,
        seoDescription: post.excerpt,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
