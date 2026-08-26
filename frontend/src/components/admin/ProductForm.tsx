'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

// ---------- Shapes ----------

interface LookupOption {
  id: string;
  name: string;
}

interface CategoryTreeNode {
  id: string;
  name: string;
  children?: CategoryTreeNode[];
}

interface CertificationOption {
  id: string;
  name: string;
  code?: string;
}

interface VariantRow {
  id?: string;
  sku: string;
  weightLabel: string;
  packagingLabel: string;
  gradeLabel: string;
  price: string;
  isDefault: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  type: string;
  position: number;
}

interface ProductDocument {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
}

// Admin product detail, as returned by ProductsService.adminFindOne.
export interface AdminProductDetail {
  id: string;
  sku: string;
  name: string;
  slug: string;
  status: string;
  categoryId?: string;
  category: { id: string; name: string } | null;
  brandId?: string;
  brand: { id: string; name: string } | null;
  originId?: string;
  origin: { id: string; name: string } | null;
  shortDescription: string | null;
  fullDescription: string | null;
  variety: string | null;
  harvestSeason: string | null;
  grade: string | null;
  moisture: string | null;
  shelfLife: string | null;
  storageTemperature: string | null;
  isOrganic: boolean;
  hsCode: string | null;
  countryOfOrigin: string | null;
  moq: string | null;
  supplyAbility: string | null;
  leadTime: string | null;
  portOfLoading: string | null;
  incoterms: string[];
  netWeight: string | null;
  grossWeight: string | null;
  unitsPerCarton: number | null;
  cartonsPerPallet: number | null;
  basePrice: number;
  currency: string;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
  documents: ProductDocument[];
  certifications: { id: string; name: string }[];
  variants: {
    id: string;
    sku: string;
    weightLabel: string | null;
    packagingLabel: string | null;
    gradeLabel: string | null;
    price: number;
    isDefault: boolean;
  }[];
}

const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'ARCHIVED'];
const DOCUMENT_TYPES = ['SPECIFICATION', 'CATALOGUE', 'COA', 'MSDS', 'PACKING_SPECIFICATION', 'DATASHEET'];
const IMAGE_TYPES = ['GALLERY', 'FACTORY', 'PACKAGING'];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function flattenCategories(nodes: CategoryTreeNode[], depth = 0): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const node of nodes) {
    out.push({ id: node.id, label: `${'— '.repeat(depth)}${node.name}` });
    if (node.children?.length) {
      out.push(...flattenCategories(node.children, depth + 1));
    }
  }
  return out;
}

function emptyVariant(): VariantRow {
  return { sku: '', weightLabel: '', packagingLabel: '', gradeLabel: '', price: '', isDefault: false };
}

interface FormState {
  sku: string;
  name: string;
  slug: string;
  status: string;
  categoryId: string;
  brandId: string;
  originId: string;
  basePrice: string;
  currency: string;
  shortDescription: string;
  fullDescription: string;
  variety: string;
  harvestSeason: string;
  grade: string;
  moisture: string;
  shelfLife: string;
  storageTemperature: string;
  isOrganic: boolean;
  hsCode: string;
  countryOfOrigin: string;
  moq: string;
  supplyAbility: string;
  leadTime: string;
  portOfLoading: string;
  incoterms: string;
  netWeight: string;
  grossWeight: string;
  unitsPerCarton: string;
  cartonsPerPallet: string;
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
}

function toFormState(p?: AdminProductDetail): FormState {
  return {
    sku: p?.sku ?? '',
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    status: p?.status ?? 'DRAFT',
    categoryId: p?.category?.id ?? p?.categoryId ?? '',
    brandId: p?.brand?.id ?? p?.brandId ?? '',
    originId: p?.origin?.id ?? p?.originId ?? '',
    basePrice: p ? String(p.basePrice) : '',
    currency: p?.currency ?? 'VND',
    shortDescription: p?.shortDescription ?? '',
    fullDescription: p?.fullDescription ?? '',
    variety: p?.variety ?? '',
    harvestSeason: p?.harvestSeason ?? '',
    grade: p?.grade ?? '',
    moisture: p?.moisture ?? '',
    shelfLife: p?.shelfLife ?? '',
    storageTemperature: p?.storageTemperature ?? '',
    isOrganic: p?.isOrganic ?? false,
    hsCode: p?.hsCode ?? '',
    countryOfOrigin: p?.countryOfOrigin ?? '',
    moq: p?.moq ?? '',
    supplyAbility: p?.supplyAbility ?? '',
    leadTime: p?.leadTime ?? '',
    portOfLoading: p?.portOfLoading ?? '',
    incoterms: p?.incoterms?.join(', ') ?? '',
    netWeight: p?.netWeight ?? '',
    grossWeight: p?.grossWeight ?? '',
    unitsPerCarton: p?.unitsPerCarton !== null && p?.unitsPerCarton !== undefined ? String(p.unitsPerCarton) : '',
    cartonsPerPallet: p?.cartonsPerPallet !== null && p?.cartonsPerPallet !== undefined ? String(p.cartonsPerPallet) : '',
    seoTitle: p?.seoTitle ?? '',
    seoDescription: p?.seoDescription ?? '',
    isFeatured: p?.isFeatured ?? false,
  };
}

function inputCls() {
  return 'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
}

function labelCls() {
  return 'text-sm font-semibold text-gray-700';
}

export function ProductForm({ productId, initialProduct }: { productId?: string; initialProduct?: AdminProductDetail }) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [form, setForm] = useState<FormState>(toFormState(initialProduct));
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [variants, setVariants] = useState<VariantRow[]>(
    initialProduct?.variants.length
      ? initialProduct.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          weightLabel: v.weightLabel ?? '',
          packagingLabel: v.packagingLabel ?? '',
          gradeLabel: v.gradeLabel ?? '',
          price: String(v.price),
          isDefault: v.isDefault,
        }))
      : [emptyVariant()],
  );
  const [certificationIds, setCertificationIds] = useState<Set<string>>(
    new Set(initialProduct?.certifications.map((c) => c.id) ?? []),
  );

  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [brands, setBrands] = useState<LookupOption[]>([]);
  const [origins, setOrigins] = useState<LookupOption[]>([]);
  const [certifications, setCertifications] = useState<CertificationOption[]>([]);

  const [images, setImages] = useState<ProductImage[]>(initialProduct?.images ?? []);
  const [documents, setDocuments] = useState<ProductDocument[]>(initialProduct?.documents ?? []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState('');
  const [imageType, setImageType] = useState('GALLERY');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('SPECIFICATION');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/catalog/categories')
      .then(({ data }) => setCategories(flattenCategories(data)))
      .catch(() => undefined);
    apiClient
      .get('/catalog/brands')
      .then(({ data }) => setBrands(data))
      .catch(() => undefined);
    apiClient
      .get('/catalog/origins')
      .then(({ data }) => setOrigins(data))
      .catch(() => undefined);
    apiClient
      .get('/catalog/certifications')
      .then(({ data }) => setCertifications(data))
      .catch(() => undefined);
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(value: string) {
    update('name', value);
    if (!slugTouched) {
      update('slug', slugify(value));
    }
  }

  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addVariant() {
    setVariants((rows) => [...rows, emptyVariant()]);
  }

  function removeVariant(index: number) {
    setVariants((rows) => rows.filter((_, i) => i !== index));
  }

  function toggleCertification(id: string) {
    setCertificationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function extractErrorMessage(err: any, fallback: string): string {
    const message = err?.response?.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    return message ?? fallback;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      sku: form.sku,
      name: form.name,
      slug: form.slug || undefined,
      status: form.status,
      categoryId: form.categoryId,
      brandId: form.brandId || undefined,
      originId: form.originId || undefined,
      basePrice: form.basePrice ? Number(form.basePrice) : undefined,
      currency: form.currency || undefined,
      shortDescription: form.shortDescription || undefined,
      fullDescription: form.fullDescription || undefined,
      variety: form.variety || undefined,
      harvestSeason: form.harvestSeason || undefined,
      grade: form.grade || undefined,
      moisture: form.moisture || undefined,
      shelfLife: form.shelfLife || undefined,
      storageTemperature: form.storageTemperature || undefined,
      isOrganic: form.isOrganic,
      hsCode: form.hsCode || undefined,
      countryOfOrigin: form.countryOfOrigin || undefined,
      moq: form.moq || undefined,
      supplyAbility: form.supplyAbility || undefined,
      leadTime: form.leadTime || undefined,
      portOfLoading: form.portOfLoading || undefined,
      incoterms: form.incoterms
        ? form.incoterms.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      netWeight: form.netWeight || undefined,
      grossWeight: form.grossWeight || undefined,
      unitsPerCarton: form.unitsPerCarton ? Number(form.unitsPerCarton) : undefined,
      cartonsPerPallet: form.cartonsPerPallet ? Number(form.cartonsPerPallet) : undefined,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      isFeatured: form.isFeatured,
      variants: variants
        .filter((v) => v.sku.trim())
        .map((v) => ({
          id: v.id,
          sku: v.sku,
          weightLabel: v.weightLabel || undefined,
          packagingLabel: v.packagingLabel || undefined,
          gradeLabel: v.gradeLabel || undefined,
          price: v.price ? Number(v.price) : 0,
          isDefault: v.isDefault,
        })),
      certificationIds: Array.from(certificationIds),
    };

    try {
      if (isEdit) {
        await apiClient.patch(`/admin/catalog/products/${productId}`, payload);
      } else {
        await apiClient.post('/admin/catalog/products', payload);
      }
      router.push('/admin/products');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to save product.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadImage() {
    if (!productId || !imageFile) return;
    setUploadingImage(true);
    setMediaError(null);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      if (imageAlt) formData.append('altText', imageAlt);
      formData.append('type', imageType);
      formData.append('position', String(images.length));
      const { data } = await apiClient.post(`/admin/catalog/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages((prev) => [...prev, data]);
      setImageFile(null);
      setImageAlt('');
    } catch (err: any) {
      setMediaError(extractErrorMessage(err, 'Failed to upload image.'));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!productId) return;
    setMediaError(null);
    try {
      await apiClient.delete(`/admin/catalog/products/${productId}/images/${imageId}`);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setMediaError(extractErrorMessage(err, 'Failed to delete image.'));
    }
  }

  async function handleUploadDocument() {
    if (!productId || !docFile || !docTitle) return;
    setUploadingDoc(true);
    setMediaError(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle);
      formData.append('type', docType);
      const { data } = await apiClient.post(`/admin/catalog/products/${productId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((prev) => [...prev, data]);
      setDocFile(null);
      setDocTitle('');
    } catch (err: any) {
      setMediaError(extractErrorMessage(err, 'Failed to upload document.'));
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (!productId) return;
    setMediaError(null);
    try {
      await apiClient.delete(`/admin/catalog/products/${productId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setMediaError(extractErrorMessage(err, 'Failed to delete document.'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Basics</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-name" className={labelCls()}>Name</label>
            <input id="pf-name" required value={form.name} onChange={(e) => handleNameChange(e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-sku" className={labelCls()}>SKU</label>
            <input id="pf-sku" required value={form.sku} onChange={(e) => update('sku', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-slug" className={labelCls()}>Slug</label>
            <input
              id="pf-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update('slug', e.target.value);
              }}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-status" className={labelCls()}>Status</label>
            <select id="pf-status" value={form.status} onChange={(e) => update('status', e.target.value)} className={inputCls()}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-category" className={labelCls()}>Category</label>
            <select
              id="pf-category"
              required
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              className={inputCls()}
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-brand" className={labelCls()}>Brand</label>
            <select id="pf-brand" value={form.brandId} onChange={(e) => update('brandId', e.target.value)} className={inputCls()}>
              <option value="">None</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-origin" className={labelCls()}>Origin</label>
            <select id="pf-origin" value={form.originId} onChange={(e) => update('originId', e.target.value)} className={inputCls()}>
              <option value="">None</option>
              {origins.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-base-price" className={labelCls()}>Base Price</label>
            <input
              id="pf-base-price"
              required
              type="number"
              step="0.01"
              value={form.basePrice}
              onChange={(e) => update('basePrice', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-currency" className={labelCls()}>Currency</label>
            <input id="pf-currency" value={form.currency} onChange={(e) => update('currency', e.target.value)} className={inputCls()} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="isFeatured"
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => update('isFeatured', e.target.checked)}
            />
            <label htmlFor="isFeatured" className="text-sm text-gray-700">
              Featured product
            </label>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="pf-short-description" className={labelCls()}>Short Description</label>
            <textarea
              id="pf-short-description"
              value={form.shortDescription}
              onChange={(e) => update('shortDescription', e.target.value)}
              rows={2}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-full-description" className={labelCls()}>Full Description</label>
            <textarea
              id="pf-full-description"
              value={form.fullDescription}
              onChange={(e) => update('fullDescription', e.target.value)}
              rows={5}
              className={inputCls()}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Agricultural Details</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="pf-variety" className={labelCls()}>Variety</label>
            <input id="pf-variety" value={form.variety} onChange={(e) => update('variety', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-harvest-season" className={labelCls()}>Harvest Season</label>
            <input
              id="pf-harvest-season"
              value={form.harvestSeason}
              onChange={(e) => update('harvestSeason', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-grade" className={labelCls()}>Grade</label>
            <input id="pf-grade" value={form.grade} onChange={(e) => update('grade', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-moisture" className={labelCls()}>Moisture</label>
            <input id="pf-moisture" value={form.moisture} onChange={(e) => update('moisture', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-shelf-life" className={labelCls()}>Shelf Life</label>
            <input id="pf-shelf-life" value={form.shelfLife} onChange={(e) => update('shelfLife', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-storage-temp" className={labelCls()}>Storage Temperature</label>
            <input
              id="pf-storage-temp"
              value={form.storageTemperature}
              onChange={(e) => update('storageTemperature', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="isOrganic"
              type="checkbox"
              checked={form.isOrganic}
              onChange={(e) => update('isOrganic', e.target.checked)}
            />
            <label htmlFor="isOrganic" className="text-sm text-gray-700">
              Organic
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Export Details</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="pf-hs-code" className={labelCls()}>HS Code</label>
            <input id="pf-hs-code" value={form.hsCode} onChange={(e) => update('hsCode', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-country-of-origin" className={labelCls()}>Country of Origin</label>
            <input
              id="pf-country-of-origin"
              value={form.countryOfOrigin}
              onChange={(e) => update('countryOfOrigin', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-moq" className={labelCls()}>MOQ</label>
            <input id="pf-moq" value={form.moq} onChange={(e) => update('moq', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-supply-ability" className={labelCls()}>Supply Ability</label>
            <input
              id="pf-supply-ability"
              value={form.supplyAbility}
              onChange={(e) => update('supplyAbility', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-lead-time" className={labelCls()}>Lead Time</label>
            <input id="pf-lead-time" value={form.leadTime} onChange={(e) => update('leadTime', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-port-of-loading" className={labelCls()}>Port of Loading</label>
            <input
              id="pf-port-of-loading"
              value={form.portOfLoading}
              onChange={(e) => update('portOfLoading', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div className="col-span-3">
            <label htmlFor="pf-incoterms" className={labelCls()}>Incoterms (comma-separated, e.g. FOB, CIF, EXW)</label>
            <input
              id="pf-incoterms"
              value={form.incoterms}
              onChange={(e) => update('incoterms', e.target.value)}
              className={inputCls()}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Packaging</h2>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div>
            <label htmlFor="pf-net-weight" className={labelCls()}>Net Weight</label>
            <input id="pf-net-weight" value={form.netWeight} onChange={(e) => update('netWeight', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-gross-weight" className={labelCls()}>Gross Weight</label>
            <input
              id="pf-gross-weight"
              value={form.grossWeight}
              onChange={(e) => update('grossWeight', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-units-per-carton" className={labelCls()}>Units / Carton</label>
            <input
              id="pf-units-per-carton"
              type="number"
              value={form.unitsPerCarton}
              onChange={(e) => update('unitsPerCarton', e.target.value)}
              className={inputCls()}
            />
          </div>
          <div>
            <label htmlFor="pf-cartons-per-pallet" className={labelCls()}>Cartons / Pallet</label>
            <input
              id="pf-cartons-per-pallet"
              type="number"
              value={form.cartonsPerPallet}
              onChange={(e) => update('cartonsPerPallet', e.target.value)}
              className={inputCls()}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">SEO</h2>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="pf-seo-title" className={labelCls()}>SEO Title</label>
            <input id="pf-seo-title" value={form.seoTitle} onChange={(e) => update('seoTitle', e.target.value)} className={inputCls()} />
          </div>
          <div>
            <label htmlFor="pf-seo-description" className={labelCls()}>SEO Description</label>
            <textarea
              id="pf-seo-description"
              value={form.seoDescription}
              onChange={(e) => update('seoDescription', e.target.value)}
              rows={2}
              className={inputCls()}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Certifications</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {certifications.length === 0 ? (
            <p className="text-sm text-gray-500">No certifications defined yet.</p>
          ) : (
            certifications.map((cert) => (
              <label key={cert.id} className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={certificationIds.has(cert.id)}
                  onChange={() => toggleCertification(cert.id)}
                />
                {cert.name}
              </label>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add Variant
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {variants.map((v, i) => (
            <div key={v.id ?? i} className="grid grid-cols-6 items-center gap-2 rounded-md border border-gray-200 p-3">
              <input
                aria-label={`Variant ${i + 1} SKU`}
                placeholder="SKU"
                value={v.sku}
                onChange={(e) => updateVariant(i, { sku: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                aria-label={`Variant ${i + 1} weight label`}
                placeholder="Weight label"
                value={v.weightLabel}
                onChange={(e) => updateVariant(i, { weightLabel: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                aria-label={`Variant ${i + 1} packaging label`}
                placeholder="Packaging label"
                value={v.packagingLabel}
                onChange={(e) => updateVariant(i, { packagingLabel: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                aria-label={`Variant ${i + 1} grade label`}
                placeholder="Grade label"
                value={v.gradeLabel}
                onChange={(e) => updateVariant(i, { gradeLabel: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                aria-label={`Variant ${i + 1} price`}
                type="number"
                step="0.01"
                placeholder="Price"
                value={v.price}
                onChange={(e) => updateVariant(i, { price: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={v.isDefault}
                    onChange={(e) => updateVariant(i, { isDefault: e.target.checked })}
                  />
                  Default
                </label>
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isEdit && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Images</h2>
            {mediaError && <p className="mt-2 text-sm text-red-600">{mediaError}</p>}
            {images.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No images yet.</p>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="rounded-md border border-gray-200 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.altText ?? ''} className="h-24 w-full rounded object-cover" />
                    <p className="mt-1 truncate text-xs text-gray-500">{img.type}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="mt-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="pf-image-file" className="text-xs font-medium text-gray-600">File</label>
                <input
                  id="pf-image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block text-sm"
                />
              </div>
              <div>
                <label htmlFor="pf-image-alt" className="text-xs font-medium text-gray-600">Alt text</label>
                <input
                  id="pf-image-alt"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="pf-image-type" className="text-xs font-medium text-gray-600">Type</label>
                <select
                  id="pf-image-type"
                  value={imageType}
                  onChange={(e) => setImageType(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {IMAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!imageFile || uploadingImage}
                onClick={handleUploadImage}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            {documents.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No documents yet.</p>
            ) : (
              <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="pf-doc-file" className="text-xs font-medium text-gray-600">File</label>
                <input
                  id="pf-doc-file"
                  type="file"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block text-sm"
                />
              </div>
              <div>
                <label htmlFor="pf-doc-title" className="text-xs font-medium text-gray-600">Title</label>
                <input
                  id="pf-doc-title"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="pf-doc-type" className="text-xs font-medium text-gray-600">Type</label>
                <select
                  id="pf-doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!docFile || !docTitle || uploadingDoc}
                onClick={handleUploadDocument}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploadingDoc ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </section>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
