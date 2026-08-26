export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  children?: Category[];
}

export interface ProductImage {
  id?: string;
  url: string;
  altText?: string | null;
}

export interface ProductListItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  basePrice: number;
  currency: string;
  isOrganic: boolean;
  isFeatured: boolean;
  image: ProductImage | null;
  category: string | null;
  origin: string | null;
  certifications?: { id: string; name: string; iconUrl?: string | null }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  weightLabel: string | null;
  packagingLabel: string | null;
  gradeLabel: string | null;
  price: number;
  compareAtPrice?: number | null;
  isDefault: boolean;
  availableStock?: number;
}

// Detail shape is genuinely different from the list shape (category/origin/brand come back
// as full related objects here, not flattened name strings) — kept as its own type rather
// than extending ProductListItem to avoid a misleading field-type clash.
export interface ProductDetail {
  id: string;
  sku: string;
  slug: string;
  name: string;
  status: string;
  shortDescription: string | null;
  fullDescription: string | null;
  basePrice: number;
  currency: string;
  isOrganic: boolean;
  isFeatured: boolean;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
  origin: { id: string; name: string; country: string; province?: string | null } | null;
  images: ProductImage[];
  scientificName?: string | null;
  variety?: string | null;
  harvestSeason?: string | null;
  moisture?: string | null;
  grade?: string | null;
  shelfLife?: string | null;
  storageTemperature?: string | null;
  hsCode?: string | null;
  countryOfOrigin?: string | null;
  moq?: string | null;
  supplyAbility?: string | null;
  leadTime?: string | null;
  portOfLoading?: string | null;
  incoterms?: string[];
  netWeight?: string | null;
  grossWeight?: string | null;
  variants: ProductVariant[];
  documents?: { id: string; title: string; type: string; fileUrl: string }[];
  certifications?: { id: string; name: string; iconUrl?: string | null }[];
  relatedProducts?: ProductListItem[];
}
