// Category.imageUrl is not populated in seed data today, so category tiles/banners fall back
// to this slug-keyed map of self-hosted illustrative photography (see frontend/public/images/categories).
// Any category slug not listed here renders a styled brand-gradient tile instead of a photo —
// deliberately, rather than inventing a photo for a bucket category that has no obvious subject.
export interface CategoryImage {
  src: string;
  alt: string;
}

export const CATEGORY_IMAGES: Record<string, CategoryImage> = {
  nuts: { src: '/images/categories/cashew.jpg', alt: 'Roasted cashew nuts' },
  cashew: { src: '/images/categories/cashew.jpg', alt: 'Roasted cashew nuts' },
  coffee: { src: '/images/categories/coffee.jpg', alt: 'Coffee beans on the branch' },
  spices: { src: '/images/categories/pepper.jpg', alt: 'Black peppercorns' },
  pepper: { src: '/images/categories/pepper.jpg', alt: 'Black peppercorns' },
  'rice-grains': { src: '/images/categories/rice.jpg', alt: 'Rice grains' },
  'coconut-products': { src: '/images/categories/coconut.jpg', alt: 'Coconut palm grove' },
};

// Shared fallback for broad processing-stage buckets (fresh / processed / frozen / dried)
// that don't map to one specific crop.
const PROCESSING_FALLBACK: CategoryImage = {
  src: '/images/facility/processing-floor.jpg',
  alt: 'Food processing facility',
};

const PROCESSING_SLUGS = ['fresh-agricultural-products', 'processed-products', 'frozen-products', 'dried-products'];
for (const slug of PROCESSING_SLUGS) {
  CATEGORY_IMAGES[slug] = PROCESSING_FALLBACK;
}

// Deterministic brand-toned gradients used when a category slug has no photo mapped above.
const FALLBACK_GRADIENTS = [
  'from-brand-600 to-brand-800',
  'from-brand-500 to-brand-700',
  'from-accent-500 to-brand-700',
  'from-brand-700 to-brand-900',
];

export function categoryImage(slug: string): CategoryImage | null {
  return CATEGORY_IMAGES[slug] ?? null;
}

export function categoryFallbackGradient(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}
