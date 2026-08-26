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
    { key: 'tayninh', name: 'Tay Ninh Peanut Fields', country: 'Vietnam', province: 'Tay Ninh', farmName: 'Tay Ninh Peanut Cooperative' },
    { key: 'lamdong', name: 'Lam Dong Highlands', country: 'Vietnam', province: 'Lam Dong', farmName: 'Lam Dong Macadamia Farms' },
    { key: 'tiengiang', name: 'Tien Giang Orchard Delta', country: 'Vietnam', province: 'Tien Giang', farmName: 'Tien Giang Fruit Cooperative' },
    { key: 'yenbai', name: 'Yen Bai Cinnamon Hills', country: 'Vietnam', province: 'Yen Bai', farmName: 'Yen Bai Spice Cooperative' },
    { key: 'thainguyen', name: 'Thai Nguyen Tea Hills', country: 'Vietnam', province: 'Thai Nguyen', farmName: 'Thai Nguyen Tea Cooperative' },
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
  const catFreshAgri = await upsertCategory('Fresh Agricultural Products', 'fresh-agricultural-products');
  const catProcessed = await upsertCategory('Processed Products', 'processed-products');
  const catFrozen = await upsertCategory('Frozen Products', 'frozen-products');
  const catDried = await upsertCategory('Dried Products', 'dried-products');
  const catPeanut = await upsertCategory('Peanut', 'peanut', catNuts.id);
  const catMacadamia = await upsertCategory('Macadamia', 'macadamia', catNuts.id);
  const catHerbsSpices = await upsertCategory('Herbs & Spices', 'herbs-spices');
  const catTea = await upsertCategory('Tea', 'tea');
  const catHoney = await upsertCategory('Honey & Bee Products', 'honey-bee-products');

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

  // ---------- Bulk catalog generator ----------
  // Generates a large, realistic product catalog (~320 items) by crossing each category's
  // "product line" names (e.g. "Roasted Cashew Nut") with its grade/style list (e.g. "W320"),
  // capped per category so the mix stays proportional rather than combinatorially exploding.
  // Each generated entry still goes through the exact same creation loop below (images,
  // documents, certifications, variants, inventory, batch, price tiers) as the 8 hand-curated
  // flagship products above it.
  function slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  type UnitProfile = 'dry' | 'liquid' | 'frozen' | 'snack';

  function variantsForUnit(unit: UnitProfile, sku: string, basePrice: number) {
    switch (unit) {
      case 'liquid':
        return [
          { sku: `${sku}-500ML`, weightLabel: '500ml', packagingLabel: 'Bottle', gradeLabel: 'Retail', price: Math.round(basePrice / 1000) * 1000 },
          { sku: `${sku}-20L`, weightLabel: '20L', packagingLabel: 'Jerry Can', gradeLabel: 'Bulk', price: Math.round((basePrice * 36) / 1000) * 1000 },
        ];
      case 'frozen':
        return [
          { sku: `${sku}-1KG`, weightLabel: '1kg', packagingLabel: 'IQF Vacuum Bag', gradeLabel: 'Retail', price: Math.round(basePrice / 1000) * 1000 },
          { sku: `${sku}-10KG`, weightLabel: '10kg', packagingLabel: 'Master Carton', gradeLabel: 'Bulk', price: Math.round((basePrice * 9) / 1000) * 1000 },
        ];
      case 'snack':
        return [
          { sku: `${sku}-200G`, weightLabel: '200g', packagingLabel: 'Box', gradeLabel: 'Retail', price: Math.round(basePrice / 1000) * 1000 },
          { sku: `${sku}-10KG`, weightLabel: '10kg', packagingLabel: 'Master Carton', gradeLabel: 'Bulk', price: Math.round((basePrice * 45) / 1000) * 1000 },
        ];
      case 'dry':
      default:
        return [
          { sku: `${sku}-500G`, weightLabel: '500g', packagingLabel: 'Vacuum Bag', gradeLabel: 'Retail', price: Math.round(basePrice / 1000) * 1000 },
          { sku: `${sku}-25KG`, weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Bulk', price: Math.round((basePrice * 47) / 1000) * 1000 },
        ];
    }
  }

  interface BulkCategoryConfig {
    key: string;
    categoryId: string;
    originId: string;
    hsCode: string;
    unit: UnitProfile;
    certPool: string[];
    lines: string[];
    grades: string[];
    priceMin: number;
    priceMax: number;
    cap: number;
    moq: string;
  }

  const bulkConfigs: BulkCategoryConfig[] = [
    {
      key: 'CASHEW2', categoryId: catCashew.id, originId: origins.binhphuoc.id, hsCode: '0801.32', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'GLOBALGAP', 'ORGANIC'],
      lines: ['Roasted Cashew Nut', 'Raw Cashew Nut', 'Salted Roasted Cashew', 'Honey Roasted Cashew', 'Wasabi Coated Cashew', 'Cashew Nut Pieces'],
      grades: ['W180', 'W210', 'W240', 'W320', 'W450', 'SW', 'LWP', 'DW', 'SP', 'BB'],
      priceMin: 140000, priceMax: 320000, cap: 40, moq: '1 x 20FT container',
    },
    {
      key: 'PEANUT', categoryId: catPeanut.id, originId: origins.tayninh.id, hsCode: '1202.42', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'VIETGAP'],
      lines: ['Raw Peanut Kernel', 'Roasted Peanut', 'Coated Peanut', 'Peanut Kernel Split'],
      grades: ['24/28', '28/32', '34/38', '38/42', '40/50', 'Blanched', 'Split'],
      priceMin: 45000, priceMax: 90000, cap: 20, moq: '5 tonnes',
    },
    {
      key: 'MACA', categoryId: catMacadamia.id, originId: origins.lamdong.id, hsCode: '0802.61', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'ORGANIC'],
      lines: ['Raw Macadamia Nut', 'Roasted Macadamia Nut', 'Salted Macadamia'],
      grades: ['Style 1', 'Style 2', 'Whole Kernel', 'Half Kernel'],
      priceMin: 280000, priceMax: 450000, cap: 12, moq: '500kg',
    },
    {
      key: 'COFFEE2', categoryId: catCoffee.id, originId: origins.daklak.id, hsCode: '0901.21', unit: 'dry',
      certPool: ['ISO22000', 'VIETGAP', 'ORGANIC', 'FDA'],
      lines: ['Robusta Coffee Beans', 'Arabica Washed Coffee Beans', 'Arabica Natural Coffee Beans', 'Arabica Honey Coffee Beans', 'Culi Robusta Coffee Beans', 'Instant Coffee 3-in-1', 'Instant Black Coffee'],
      grades: ['Grade 1', 'Grade 2', 'Screen 16', 'Screen 18', 'Specialty', 'Fine Robusta'],
      priceMin: 75000, priceMax: 180000, cap: 30, moq: '500kg',
    },
    {
      key: 'PEPPER2', categoryId: catPepper.id, originId: origins.phuquoc.id, hsCode: '0904.11', unit: 'dry',
      certPool: ['HACCP', 'BRC', 'HALAL'],
      lines: ['Black Pepper', 'White Pepper', 'Red Pepper', 'Green Pepper (Dried)', 'Green Pepper (Pickled)', 'Pepper Powder'],
      grades: ['500GL', '550GL', '570GL', 'Grade A', 'Grade B', 'ASTA'],
      priceMin: 140000, priceMax: 260000, cap: 25, moq: '1 tonne',
    },
    {
      key: 'RICE2', categoryId: catRice.id, originId: origins.angiang.id, hsCode: '1006.30', unit: 'dry',
      certPool: ['VIETGAP', 'ISO22000', 'GLOBALGAP'],
      lines: ['Jasmine Rice', 'ST25 Fragrant Rice', 'White Glutinous Rice', 'Black Glutinous Rice', 'Brown Rice', 'Japonica Rice', 'Broken Rice'],
      grades: ['5% Broken', '10% Broken', '15% Broken', '25% Broken', '100% Broken', 'Premium'],
      priceMin: 16000, priceMax: 32000, cap: 30, moq: '20 tonnes',
    },
    {
      key: 'COCONUT2', categoryId: catCoconut.id, originId: origins.bentre.id, hsCode: '0801.11', unit: 'dry',
      certPool: ['HACCP', 'ORGANIC', 'ISO22000'],
      lines: ['Desiccated Coconut', 'Coconut Milk Powder', 'Coconut Oil', 'Coconut Water (Canned)', 'Coconut Sugar', 'Coconut Cream', 'Coconut Charcoal Briquette'],
      grades: ['Fine High-Fat', 'Fine Low-Fat', 'Medium Desiccated', 'Coarse Desiccated', 'Virgin Cold-Pressed', 'RBD Grade', 'Organic'],
      priceMin: 55000, priceMax: 140000, cap: 30, moq: '1 x 20FT container',
    },
    {
      key: 'DRIED', categoryId: catDried.id, originId: origins.tiengiang.id, hsCode: '0813.40', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'FDA'],
      lines: ['Dried Mango', 'Dried Banana', 'Dried Jackfruit', 'Dried Pineapple', 'Dried Dragon Fruit', 'Dried Longan', 'Dried Lychee', 'Mixed Dried Fruit'],
      grades: ['Natural (No Sugar)', 'Lightly Sweetened', 'Sun-Dried', 'Low-Temp Dried', 'Premium Select'],
      priceMin: 85000, priceMax: 220000, cap: 30, moq: '500kg',
    },
    {
      key: 'FROZEN', categoryId: catFrozen.id, originId: origins.tiengiang.id, hsCode: '0811.90', unit: 'frozen',
      certPool: ['HACCP', 'BRC', 'FDA'],
      lines: ['Frozen Durian', 'Frozen Mango', 'Frozen Jackfruit', 'Frozen Okra', 'Frozen Edamame', 'Frozen Sweet Corn', 'Frozen Passion Fruit Puree', 'Frozen Dragon Fruit'],
      grades: ['IQF Whole', 'IQF Diced', 'IQF Sliced', 'IQF Puree'],
      priceMin: 60000, priceMax: 190000, cap: 24, moq: '1 x reefer container',
    },
    {
      key: 'HERBS', categoryId: catHerbsSpices.id, originId: origins.yenbai.id, hsCode: '0910.99', unit: 'dry',
      certPool: ['HACCP', 'ORGANIC', 'ISO22000'],
      lines: ['Cinnamon', 'Star Anise', 'Turmeric', 'Dried Ginger', 'Chili', 'Cardamom', 'Lemongrass', 'Bay Leaf'],
      grades: ['Whole', 'Ground/Powder', 'Split', 'Sifted', 'Organic'],
      priceMin: 40000, priceMax: 160000, cap: 30, moq: '500kg',
    },
    {
      key: 'TEA', categoryId: catTea.id, originId: origins.thainguyen.id, hsCode: '0902.20', unit: 'dry',
      certPool: ['ISO22000', 'ORGANIC', 'VIETGAP'],
      lines: ['Green Tea', 'Lotus Tea', 'Artichoke Tea', 'Moringa Tea', 'Ginger Tea Blend'],
      grades: ['Grade A Leaf', 'Grade B Leaf', 'Bud & Leaf', 'Tea Bag Cut'],
      priceMin: 70000, priceMax: 220000, cap: 16, moq: '300kg',
    },
    {
      key: 'HONEY', categoryId: catHoney.id, originId: origins.daklak.id, hsCode: '0409.00', unit: 'liquid',
      certPool: ['HACCP', 'ORGANIC', 'FDA'],
      lines: ['Longan Flower Honey', 'Forest Wild Honey', 'Rubber Flower Honey', 'Royal Jelly', 'Bee Propolis'],
      grades: ['Raw Unfiltered', 'Filtered', 'Crystallization-Resistant', 'Organic Certified'],
      priceMin: 90000, priceMax: 260000, cap: 12, moq: '200kg',
    },
    {
      key: 'SNACK', categoryId: catProcessed.id, originId: origins.bentre.id, hsCode: '1704.90', unit: 'snack',
      certPool: ['HACCP', 'ISO22000', 'FDA'],
      lines: ['Coconut Candy', 'Cashew Brittle', 'Sesame Peanut Candy', 'Ginger Candy', 'Rice Paper Chips'],
      grades: ['Original', 'Pandan', 'Durian', 'Ginger', 'Sesame', 'Mixed Nut'],
      priceMin: 35000, priceMax: 90000, cap: 20, moq: '2000 units',
    },
    {
      key: 'FRESH', categoryId: catFreshAgri.id, originId: origins.tiengiang.id, hsCode: '0810.90', unit: 'dry',
      certPool: ['GLOBALGAP', 'VIETGAP', 'HACCP'],
      lines: ['Fresh Dragon Fruit', 'Fresh Mango (Cat Chu)', 'Fresh Pomelo', 'Fresh Ginger', 'Fresh Garlic'],
      grades: ['Class 1 Export', 'Class 2 Standard'],
      priceMin: 20000, priceMax: 55000, cap: 10, moq: '1 x reefer container',
    },
  ];

  function generateBulkProducts(): SeedProduct[] {
    const generated: SeedProduct[] = [];
    for (const cfg of bulkConfigs) {
      const combos: { line: string; grade: string; lineIdx: number; gradeIdx: number }[] = [];
      cfg.lines.forEach((line, lineIdx) => {
        cfg.grades.forEach((grade, gradeIdx) => {
          combos.push({ line, grade, lineIdx, gradeIdx });
        });
      });
      const chosen = combos.slice(0, cfg.cap);
      chosen.forEach(({ line, grade, lineIdx, gradeIdx }, i) => {
        const gradeSpan = cfg.grades.length > 1 ? cfg.grades.length - 1 : 1;
        const basePrice =
          Math.round(
            (cfg.priceMin + ((cfg.priceMax - cfg.priceMin) * gradeIdx) / gradeSpan + lineIdx * 1500) / 500,
          ) * 500;
        const name = `${line} ${grade}`;
        const slug = `${cfg.key.toLowerCase()}-${slugify(line)}-${slugify(grade)}`;
        // Cap the line segment's length (not the whole concatenated string) so the grade
        // code — the part that actually distinguishes SKUs within one line — is never the
        // part silently cut off, which previously caused e.g. "...Screen 16" and
        // "...Screen 18" to both truncate to the same 40-char SKU.
        const lineCode = slugify(line).toUpperCase().replace(/-/g, '').slice(0, 18);
        const gradeCode = slugify(grade).toUpperCase().replace(/-/g, '').slice(0, 14);
        const sku = `${cfg.key}-${lineCode}-${gradeCode}`;
        const certCodes = [cfg.certPool[i % cfg.certPool.length], cfg.certPool[(i + 1) % cfg.certPool.length]];
        generated.push({
          sku,
          name,
          slug,
          categoryId: cfg.categoryId,
          originId: cfg.originId,
          certCodes,
          basePrice,
          moq: cfg.moq,
          hsCode: cfg.hsCode,
          variants: variantsForUnit(cfg.unit, sku, basePrice),
        });
      });
    }
    return generated;
  }

  const handCurated: SeedProduct[] = [
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

  const products: SeedProduct[] = [...handCurated, ...generateBulkProducts()];
  console.log(`Seeding ${products.length} products...`);

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
