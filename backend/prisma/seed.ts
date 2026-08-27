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
import * as fs from 'fs';
import * as path from 'path';

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
    imageUrls: string[];
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

  // ---------- Product images ----------
  // Real, product-accurate photos (replacing the old random picsum.photos placeholders).
  // Sourced from Unsplash (unsplash.com/license — free for commercial use, no attribution
  // required) and committed under ./seed-images/<category-key-or-_generic>/<file>.jpg, one photo
  // per *product line* (not per SKU/grade — grade variants of the same line, e.g. Cashew W180 vs
  // W320, are visually identical). At seed time we copy each source file into the storage
  // service's upload directory under a flat, deterministic filename: LocalStorageService
  // (backend/src/common/services/local-storage.service.ts) and UploadsController
  // (backend/src/modules/uploads/uploads.controller.ts) only ever read/write a single flat
  // filename directly under UPLOAD_DIR — the route is `GET /api/v1/uploads/:fileName`, a single
  // path segment, so a nested subdirectory would 404 — so we replicate that exact convention here
  // (same env vars, same URL shape) instead of going through Nest's DI container, which this
  // standalone script doesn't have.
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? 'http://localhost:8730';
  const seedImagesDir = path.join(__dirname, 'seed-images');
  fs.mkdirSync(uploadDir, { recursive: true });

  const publishedImageCache = new Map<string, string>();

  // Copies seed-images/<dir>/<fileBaseName> into UPLOAD_DIR under a flat "seed-<dir>-<file>" name
  // and returns the public URL UploadsController will serve it at. Idempotent across repeated
  // seed runs (same source -> same destination filename -> overwritten, not duplicated).
  function publishSeedImage(dir: string, fileBaseName: string): string {
    const cacheKey = `${dir}/${fileBaseName}`;
    const cached = publishedImageCache.get(cacheKey);
    if (cached) return cached;
    const srcPath = path.join(seedImagesDir, dir, fileBaseName);
    const destFileName = `seed-${dir.toLowerCase()}-${fileBaseName}`;
    const destPath = path.join(uploadDir, destFileName);
    fs.copyFileSync(srcPath, destPath);
    const url = `${publicBaseUrl}/api/v1/uploads/${destFileName}`;
    publishedImageCache.set(cacheKey, url);
    return url;
  }

  // One sourced photo per product line per bulk category. Grade variants within a line
  // intentionally share the same photo. Where two lines look visually identical (e.g. "Salted
  // Roasted Cashew" vs "Roasted Cashew Nut"), they intentionally point at the same file rather
  // than forcing an artificial second photo. Keys are `slugify(line)`.
  const bulkLineImage: Record<string, Record<string, string>> = {
    CASHEW2: {
      'roasted-cashew-nut': 'roasted-cashew-nut.jpg',
      'raw-cashew-nut': 'raw-cashew-nut.jpg',
      'salted-roasted-cashew': 'roasted-cashew-nut.jpg',
      'honey-roasted-cashew': 'honey-roasted-cashew.jpg',
      'wasabi-coated-cashew': 'wasabi-coated-cashew.jpg',
      'cashew-nut-pieces': 'cashew-nut-pieces.jpg',
    },
    PEANUT: {
      'raw-peanut-kernel': 'raw-peanut-kernel.jpg',
      'roasted-peanut': 'roasted-peanut.jpg',
      'coated-peanut': 'coated-peanut.jpg',
      'peanut-kernel-split': 'peanut-kernel-split.jpg',
    },
    MACA: {
      'raw-macadamia-nut': 'raw-macadamia-nut.jpg',
      'roasted-macadamia-nut': 'roasted-macadamia-nut.jpg',
      'salted-macadamia': 'roasted-macadamia-nut.jpg',
    },
    COFFEE2: {
      'robusta-coffee-beans': 'coffee-beans-roasted.jpg',
      'arabica-washed-coffee-beans': 'coffee-beans-roasted.jpg',
      'arabica-natural-coffee-beans': 'coffee-beans-roasted.jpg',
      'arabica-honey-coffee-beans': 'coffee-beans-roasted.jpg',
      'culi-robusta-coffee-beans': 'coffee-beans-roasted.jpg',
      'instant-coffee-3-in-1': 'instant-coffee-3-in-1.jpg',
      'instant-black-coffee': 'instant-black-coffee.jpg',
    },
    PEPPER2: {
      'black-pepper': 'black-pepper.jpg',
      'white-pepper': 'white-pepper.jpg',
      'red-pepper': 'red-pepper.jpg',
      'green-pepper-dried': 'green-pepper-dried.jpg',
      'green-pepper-pickled': 'green-pepper-pickled.jpg',
      'pepper-powder': 'pepper-powder.jpg',
    },
    RICE2: {
      'jasmine-rice': 'white-rice.jpg',
      'st25-fragrant-rice': 'white-rice.jpg',
      'white-glutinous-rice': 'white-glutinous-rice.jpg',
      'black-glutinous-rice': 'black-glutinous-rice.jpg',
      'brown-rice': 'brown-rice.jpg',
      'japonica-rice': 'white-rice.jpg',
      'broken-rice': 'white-rice.jpg',
    },
    COCONUT2: {
      'desiccated-coconut': 'desiccated-coconut.jpg',
      'coconut-milk-powder': 'coconut-milk-powder.jpg',
      'coconut-oil': 'coconut-oil.jpg',
      'coconut-water-canned': 'coconut-water-canned.jpg',
      'coconut-sugar': 'coconut-sugar.jpg',
      'coconut-cream': 'coconut-cream.jpg',
      'coconut-charcoal-briquette': 'coconut-charcoal-briquette.jpg',
    },
    DRIED: {
      'dried-mango': 'dried-mango.jpg',
      'dried-banana': 'dried-banana.jpg',
      'dried-jackfruit': 'dried-jackfruit.jpg',
      'dried-pineapple': 'dried-pineapple.jpg',
      'dried-dragon-fruit': 'mixed-dried-fruit.jpg',
      'dried-longan': 'dried-longan.jpg',
      'dried-lychee': 'dried-longan.jpg',
      'mixed-dried-fruit': 'mixed-dried-fruit.jpg',
    },
    FROZEN: {
      'frozen-durian': 'frozen-durian.jpg',
      'frozen-mango': 'frozen-mango.jpg',
      'frozen-jackfruit': 'frozen-jackfruit.jpg',
      'frozen-okra': 'frozen-okra.jpg',
      'frozen-edamame': 'frozen-edamame.jpg',
      'frozen-sweet-corn': 'frozen-sweet-corn.jpg',
      'frozen-passion-fruit-puree': 'frozen-passion-fruit-puree.jpg',
      'frozen-dragon-fruit': 'frozen-dragon-fruit.jpg',
    },
    HERBS: {
      cinnamon: 'cinnamon.jpg',
      'star-anise': 'star-anise.jpg',
      turmeric: 'turmeric.jpg',
      'dried-ginger': 'dried-ginger.jpg',
      chili: 'chili.jpg',
      cardamom: 'cardamom.jpg',
      lemongrass: 'lemongrass.jpg',
      'bay-leaf': 'bay-leaf.jpg',
    },
    TEA: {
      'green-tea': 'green-tea.jpg',
      'lotus-tea': 'lotus-tea.jpg',
      'artichoke-tea': 'artichoke-tea.jpg',
      'moringa-tea': 'moringa-tea.jpg',
      'ginger-tea-blend': 'ginger-tea-blend.jpg',
    },
    HONEY: {
      'longan-flower-honey': 'honey-jar.jpg',
      'forest-wild-honey': 'honey-jar.jpg',
      'rubber-flower-honey': 'honey-jar.jpg',
      'royal-jelly': 'royal-jelly.jpg',
      'bee-propolis': 'bee-propolis.jpg',
    },
    SNACK: {
      'coconut-candy': 'coconut-candy.jpg',
      'cashew-brittle': 'cashew-brittle.jpg',
      'sesame-peanut-candy': 'sesame-peanut-candy.jpg',
      'ginger-candy': 'ginger-candy.jpg',
      'rice-paper-chips': 'rice-paper-chips.jpg',
    },
    FRESH: {
      'fresh-dragon-fruit': 'fresh-dragon-fruit.jpg',
      'fresh-mango-cat-chu': 'fresh-mango-cat-chu.jpg',
      'fresh-pomelo': 'fresh-pomelo.jpg',
      'fresh-ginger': 'fresh-ginger.jpg',
      'fresh-garlic': 'fresh-garlic.jpg',
    },
  };

  // Last-resort fallback (never picsum.photos) if a line's photo is missing from disk for any
  // reason — cycles through a few generic "grains/spices/nuts in bulk" shots.
  const genericFallbackFiles = ['grains-bags.jpg', 'spices-bowls.jpg', 'nuts-mix.jpg'];
  let genericFallbackIdx = 0;

  function getLineImageUrls(categoryKey: string, line: string): string[] {
    const lineSlug = slugify(line);
    const fileBaseName = bulkLineImage[categoryKey]?.[lineSlug];
    let url: string;
    if (fileBaseName && fs.existsSync(path.join(seedImagesDir, categoryKey, fileBaseName))) {
      url = publishSeedImage(categoryKey, fileBaseName);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`No sourced photo for ${categoryKey}:${lineSlug} — using generic fallback.`);
      const fallbackFile = genericFallbackFiles[genericFallbackIdx % genericFallbackFiles.length];
      genericFallbackIdx += 1;
      url = publishSeedImage('_generic', fallbackFile);
    }
    // Same photo for both gallery slots is fine — grade/SKU variants of one product line are
    // visually identical, per the task's guidance.
    return [url, url];
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

  // Price ranges below are grounded in researched Aug-2026 Vietnamese wholesale/export market
  // data (cashew W320 FOB ~$3.2-3.6/kg, robusta coffee ~96,800 VND/kg farm-gate, black pepper
  // FOB ~$5,990-6,520/ton, 5%-broken rice FOB ~$360-415/ton, star anise wholesale ~$2.9-8.9/kg,
  // at ~26,100 VND/USD) with a retail markup applied over the bulk/FOB floor to represent the
  // packaged small-pack price a buyer sees on this site — not a literal per-SKU quote, since
  // real catalogs price by grade tier too, not by individually re-verified line item.
  const bulkConfigs: BulkCategoryConfig[] = [
    {
      key: 'CASHEW2', categoryId: catCashew.id, originId: origins.binhphuoc.id, hsCode: '0801.32', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'GLOBALGAP', 'ORGANIC'],
      lines: ['Roasted Cashew Nut', 'Raw Cashew Nut', 'Salted Roasted Cashew', 'Honey Roasted Cashew', 'Wasabi Coated Cashew', 'Cashew Nut Pieces'],
      grades: ['W180', 'W210', 'W240', 'W320', 'W450', 'SW', 'LWP', 'DW', 'SP', 'BB'],
      priceMin: 150000, priceMax: 340000, cap: 40, moq: '1 x 20FT container',
    },
    {
      key: 'PEANUT', categoryId: catPeanut.id, originId: origins.tayninh.id, hsCode: '1202.42', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'VIETGAP'],
      lines: ['Raw Peanut Kernel', 'Roasted Peanut', 'Coated Peanut', 'Peanut Kernel Split'],
      grades: ['24/28', '28/32', '34/38', '38/42', '40/50', 'Blanched', 'Split'],
      priceMin: 40000, priceMax: 90000, cap: 20, moq: '5 tonnes',
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
      priceMin: 100000, priceMax: 230000, cap: 30, moq: '500kg',
    },
    {
      key: 'PEPPER2', categoryId: catPepper.id, originId: origins.phuquoc.id, hsCode: '0904.11', unit: 'dry',
      certPool: ['HACCP', 'BRC', 'HALAL'],
      lines: ['Black Pepper', 'White Pepper', 'Red Pepper', 'Green Pepper (Dried)', 'Green Pepper (Pickled)', 'Pepper Powder'],
      grades: ['500GL', '550GL', '570GL', 'Grade A', 'Grade B', 'ASTA'],
      priceMin: 165000, priceMax: 290000, cap: 25, moq: '1 tonne',
    },
    {
      key: 'RICE2', categoryId: catRice.id, originId: origins.angiang.id, hsCode: '1006.30', unit: 'dry',
      certPool: ['VIETGAP', 'ISO22000', 'GLOBALGAP'],
      lines: ['Jasmine Rice', 'ST25 Fragrant Rice', 'White Glutinous Rice', 'Black Glutinous Rice', 'Brown Rice', 'Japonica Rice', 'Broken Rice'],
      grades: ['5% Broken', '10% Broken', '15% Broken', '25% Broken', '100% Broken', 'Premium'],
      priceMin: 17000, priceMax: 40000, cap: 30, moq: '20 tonnes',
    },
    {
      key: 'COCONUT2', categoryId: catCoconut.id, originId: origins.bentre.id, hsCode: '0801.11', unit: 'dry',
      certPool: ['HACCP', 'ORGANIC', 'ISO22000'],
      lines: ['Desiccated Coconut', 'Coconut Milk Powder', 'Coconut Oil', 'Coconut Water (Canned)', 'Coconut Sugar', 'Coconut Cream', 'Coconut Charcoal Briquette'],
      grades: ['Fine High-Fat', 'Fine Low-Fat', 'Medium Desiccated', 'Coarse Desiccated', 'Virgin Cold-Pressed', 'RBD Grade', 'Organic'],
      priceMin: 60000, priceMax: 220000, cap: 30, moq: '1 x 20FT container',
    },
    {
      key: 'DRIED', categoryId: catDried.id, originId: origins.tiengiang.id, hsCode: '0813.40', unit: 'dry',
      certPool: ['HACCP', 'ISO22000', 'FDA'],
      lines: ['Dried Mango', 'Dried Banana', 'Dried Jackfruit', 'Dried Pineapple', 'Dried Dragon Fruit', 'Dried Longan', 'Dried Lychee', 'Mixed Dried Fruit'],
      grades: ['Natural (No Sugar)', 'Lightly Sweetened', 'Sun-Dried', 'Low-Temp Dried', 'Premium Select'],
      priceMin: 85000, priceMax: 230000, cap: 30, moq: '500kg',
    },
    {
      key: 'FROZEN', categoryId: catFrozen.id, originId: origins.tiengiang.id, hsCode: '0811.90', unit: 'frozen',
      certPool: ['HACCP', 'BRC', 'FDA'],
      lines: ['Frozen Durian', 'Frozen Mango', 'Frozen Jackfruit', 'Frozen Okra', 'Frozen Edamame', 'Frozen Sweet Corn', 'Frozen Passion Fruit Puree', 'Frozen Dragon Fruit'],
      grades: ['IQF Whole', 'IQF Diced', 'IQF Sliced', 'IQF Puree'],
      priceMin: 65000, priceMax: 280000, cap: 24, moq: '1 x reefer container',
    },
    {
      key: 'HERBS', categoryId: catHerbsSpices.id, originId: origins.yenbai.id, hsCode: '0910.99', unit: 'dry',
      certPool: ['HACCP', 'ORGANIC', 'ISO22000'],
      lines: ['Cinnamon', 'Star Anise', 'Turmeric', 'Dried Ginger', 'Chili', 'Cardamom', 'Lemongrass', 'Bay Leaf'],
      grades: ['Whole', 'Ground/Powder', 'Split', 'Sifted', 'Organic'],
      priceMin: 45000, priceMax: 240000, cap: 30, moq: '500kg',
    },
    {
      key: 'TEA', categoryId: catTea.id, originId: origins.thainguyen.id, hsCode: '0902.20', unit: 'dry',
      certPool: ['ISO22000', 'ORGANIC', 'VIETGAP'],
      lines: ['Green Tea', 'Lotus Tea', 'Artichoke Tea', 'Moringa Tea', 'Ginger Tea Blend'],
      grades: ['Grade A Leaf', 'Grade B Leaf', 'Bud & Leaf', 'Tea Bag Cut'],
      priceMin: 75000, priceMax: 260000, cap: 16, moq: '300kg',
    },
    {
      key: 'HONEY', categoryId: catHoney.id, originId: origins.daklak.id, hsCode: '0409.00', unit: 'liquid',
      certPool: ['HACCP', 'ORGANIC', 'FDA'],
      lines: ['Longan Flower Honey', 'Forest Wild Honey', 'Rubber Flower Honey', 'Royal Jelly', 'Bee Propolis'],
      grades: ['Raw Unfiltered', 'Filtered', 'Crystallization-Resistant', 'Organic Certified'],
      priceMin: 130000, priceMax: 380000, cap: 12, moq: '200kg',
    },
    {
      key: 'SNACK', categoryId: catProcessed.id, originId: origins.bentre.id, hsCode: '1704.90', unit: 'snack',
      certPool: ['HACCP', 'ISO22000', 'FDA'],
      lines: ['Coconut Candy', 'Cashew Brittle', 'Sesame Peanut Candy', 'Ginger Candy', 'Rice Paper Chips'],
      grades: ['Original', 'Pandan', 'Durian', 'Ginger', 'Sesame', 'Mixed Nut'],
      priceMin: 28000, priceMax: 75000, cap: 20, moq: '2000 units',
    },
    {
      key: 'FRESH', categoryId: catFreshAgri.id, originId: origins.tiengiang.id, hsCode: '0810.90', unit: 'dry',
      certPool: ['GLOBALGAP', 'VIETGAP', 'HACCP'],
      lines: ['Fresh Dragon Fruit', 'Fresh Mango (Cat Chu)', 'Fresh Pomelo', 'Fresh Ginger', 'Fresh Garlic'],
      grades: ['Class 1 Export', 'Class 2 Standard'],
      priceMin: 18000, priceMax: 50000, cap: 10, moq: '1 x reefer container',
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
          imageUrls: getLineImageUrls(cfg.key, line),
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
      imageUrls: getLineImageUrls('CASHEW2', 'Roasted Cashew Nut'),
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
      imageUrls: getLineImageUrls('CASHEW2', 'Raw Cashew Nut'),
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
      basePrice: 105000,
      moq: '500kg',
      hsCode: '0901.21',
      imageUrls: getLineImageUrls('COFFEE2', 'Robusta Coffee Beans'),
      variants: [
        { sku: 'COFFEE-ROBUSTA-500G', weightLabel: '500g', packagingLabel: 'Bag', gradeLabel: 'Grade 1', price: 105000 },
        { sku: 'COFFEE-ROBUSTA-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Grade 1', price: 4600000 },
      ],
    },
    {
      sku: 'COFFEE-ARABICA',
      name: 'Dak Lak Washed Arabica Coffee Beans',
      slug: 'dak-lak-washed-arabica-coffee',
      categoryId: catCoffee.id,
      originId: origins.daklak.id,
      certCodes: ['ORGANIC', 'FDA'],
      basePrice: 165000,
      moq: '500kg',
      hsCode: '0901.11',
      imageUrls: getLineImageUrls('COFFEE2', 'Arabica Washed Coffee Beans'),
      variants: [
        { sku: 'COFFEE-ARABICA-500G', weightLabel: '500g', packagingLabel: 'Bag', gradeLabel: 'Specialty', price: 165000 },
        { sku: 'COFFEE-ARABICA-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Specialty', price: 7500000 },
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
      imageUrls: getLineImageUrls('PEPPER2', 'Black Pepper'),
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
      imageUrls: getLineImageUrls('PEPPER2', 'White Pepper'),
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
      basePrice: 24000,
      moq: '20 tonnes',
      hsCode: '1006.30',
      imageUrls: getLineImageUrls('RICE2', 'Jasmine Rice'),
      variants: [
        { sku: 'RICE-JASMINE-5KG', weightLabel: '5kg', packagingLabel: 'Bag', gradeLabel: '5% Broken', price: 120000 },
        { sku: 'RICE-JASMINE-50KG', weightLabel: '50kg', packagingLabel: 'Bag', gradeLabel: '5% Broken', price: 1150000 },
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
      imageUrls: getLineImageUrls('COCONUT2', 'Desiccated Coconut'),
      variants: [
        { sku: 'COCONUT-DRIED-1KG', weightLabel: '1kg', packagingLabel: 'Vacuum Bag', gradeLabel: 'Fine', price: 65000 },
        { sku: 'COCONUT-DRIED-25KG', weightLabel: '25kg', packagingLabel: 'Carton', gradeLabel: 'Fine', price: 1500000 },
      ],
    },
  ];

  const products: SeedProduct[] = [...handCurated, ...generateBulkProducts()];
  console.log(`Seeding ${products.length} products...`);

  // Normally this upsert's `update` is `{}` (a no-op) so re-running the seed never clobbers an
  // admin's manual edits made via /admin/products. Set RESYNC_IMAGES_AND_PRICES=true for a
  // one-time re-sync of just the generated image/price data onto already-existing rows (e.g.
  // after correcting the price formulas or swapping in real product photography) — this is a
  // deliberate, explicit opt-in, not the default seeding behavior.
  const resyncImagesAndPrices = process.env.RESYNC_IMAGES_AND_PRICES === 'true';

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: resyncImagesAndPrices
        ? {
            basePrice: p.basePrice,
            images: {
              deleteMany: {},
              create: p.imageUrls.map((url, position) => ({ url, position, type: 'GALLERY' as const })),
            },
          }
        : {},
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
          create: p.imageUrls.map((url, position) => ({ url, position, type: 'GALLERY' })),
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

    if (resyncImagesAndPrices) {
      for (const v of p.variants) {
        await prisma.productVariant
          .update({ where: { sku: v.sku }, data: { price: v.price } })
          .catch(() => undefined);
      }
    }

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
