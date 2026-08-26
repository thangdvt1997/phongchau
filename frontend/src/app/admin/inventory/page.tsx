'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isDefault: boolean;
}

interface InventoryRow {
  id: string;
  productVariantId: string;
  variantSku: string;
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  quantityOnHand: number;
  quantityReserved: number;
  available: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  updatedAt: string;
}

type AdjustType = 'IN' | 'OUT' | 'ADJUST';

function inputCls() {
  return 'rounded-md border border-gray-300 px-3 py-2 text-sm';
}

function extractErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message ?? fallback;
}

export default function AdminInventoryPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', address: '' });
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);

  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [adjustForm, setAdjustForm] = useState({
    variantSearch: '',
    warehouseId: '',
    quantity: '',
    type: 'IN' as AdjustType,
    reference: '',
  });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  function loadWarehouses() {
    apiClient
      .get('/admin/warehouses')
      .then(({ data }) => setWarehouses(data))
      .catch((err) => setWarehouseError(extractErrorMessage(err, 'Failed to load warehouses.')));
  }

  function loadInventory() {
    setInventoryLoading(true);
    apiClient
      .get('/admin/inventory', { params: { pageSize: 100, lowStockOnly: lowStockOnly || undefined } })
      .then(({ data }) => setInventory(data.items))
      .catch((err) => setInventoryError(extractErrorMessage(err, 'Failed to load inventory.')))
      .finally(() => setInventoryLoading(false));
  }

  useEffect(loadWarehouses, []);
  useEffect(loadInventory, [lowStockOnly]);

  // Map of known variant SKU -> productVariantId, built from the currently loaded
  // inventory rows, used to resolve the "search by SKU or ID" adjust-stock field.
  const skuToVariantId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of inventory) {
      map.set(row.variantSku, row.productVariantId);
    }
    return map;
  }, [inventory]);

  async function handleCreateWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setWarehouseSubmitting(true);
    setWarehouseError(null);
    try {
      await apiClient.post('/admin/warehouses', {
        name: warehouseForm.name,
        code: warehouseForm.code,
        address: warehouseForm.address || undefined,
      });
      setWarehouseForm({ name: '', code: '', address: '' });
      loadWarehouses();
    } catch (err: any) {
      setWarehouseError(extractErrorMessage(err, 'Failed to create warehouse.'));
    } finally {
      setWarehouseSubmitting(false);
    }
  }

  async function handleDeleteWarehouse(id: string) {
    setWarehouseError(null);
    try {
      await apiClient.delete(`/admin/warehouses/${id}`);
      loadWarehouses();
    } catch (err: any) {
      setWarehouseError(extractErrorMessage(err, 'Failed to delete warehouse.'));
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setAdjustSubmitting(true);
    setAdjustError(null);
    setAdjustSuccess(null);

    const searchValue = adjustForm.variantSearch.trim();
    const productVariantId = skuToVariantId.get(searchValue) ?? searchValue;

    if (!productVariantId || !adjustForm.warehouseId || !adjustForm.quantity) {
      setAdjustError('Variant, warehouse, and quantity are required.');
      setAdjustSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/admin/inventory/adjust', {
        productVariantId,
        warehouseId: adjustForm.warehouseId,
        quantity: Number(adjustForm.quantity),
        type: adjustForm.type,
        reference: adjustForm.reference || undefined,
      });
      setAdjustSuccess('Stock adjusted successfully.');
      setAdjustForm({ variantSearch: '', warehouseId: '', quantity: '', type: 'IN', reference: '' });
      loadInventory();
    } catch (err: any) {
      setAdjustError(extractErrorMessage(err, 'Failed to adjust stock.'));
    } finally {
      setAdjustSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Inventory &amp; Warehouses</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Warehouses</h2>
        <form
          onSubmit={handleCreateWarehouse}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-4"
        >
          <input
            aria-label="Warehouse name"
            required
            placeholder="Name"
            value={warehouseForm.name}
            onChange={(e) => setWarehouseForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls()}
          />
          <input
            aria-label="Warehouse code"
            required
            placeholder="Code"
            value={warehouseForm.code}
            onChange={(e) => setWarehouseForm((f) => ({ ...f, code: e.target.value }))}
            className={inputCls()}
          />
          <input
            aria-label="Warehouse address"
            placeholder="Address"
            value={warehouseForm.address}
            onChange={(e) => setWarehouseForm((f) => ({ ...f, address: e.target.value }))}
            className={inputCls()}
          />
          <button
            type="submit"
            disabled={warehouseSubmitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add Warehouse
          </button>
        </form>

        {warehouseError && <p className="mt-3 text-sm text-red-600">{warehouseError}</p>}

        {warehouses.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No warehouses yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Address</th>
                  <th className="px-4 py-2 font-medium">Default</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-2 font-medium text-gray-800">{w.name}</td>
                    <td className="px-4 py-2 text-gray-600">{w.code}</td>
                    <td className="px-4 py-2 text-gray-600">{w.address ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{w.isDefault ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteWarehouse(w.id)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>

        {inventoryError && <p className="mt-3 text-sm text-red-600">{inventoryError}</p>}

        {inventoryLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No inventory records yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Variant SKU</th>
                  <th className="px-4 py-2 font-medium">Warehouse</th>
                  <th className="px-4 py-2 font-medium">On Hand</th>
                  <th className="px-4 py-2 font-medium">Reserved</th>
                  <th className="px-4 py-2 font-medium">Available</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.map((row) => (
                  <tr key={row.id} className={row.isLowStock ? 'bg-red-50' : undefined}>
                    <td className="px-4 py-2 text-gray-800">{row.productName}</td>
                    <td className="px-4 py-2 text-gray-600">{row.variantSku}</td>
                    <td className="px-4 py-2 text-gray-600">{row.warehouseName}</td>
                    <td className="px-4 py-2 text-gray-600">{row.quantityOnHand}</td>
                    <td className="px-4 py-2 text-gray-600">{row.quantityReserved}</td>
                    <td className="px-4 py-2 text-gray-600">{row.available}</td>
                    <td className="px-4 py-2">
                      {row.isLowStock ? (
                        <span className="font-medium text-red-600">Low stock</span>
                      ) : (
                        <span className="text-gray-500">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
        <form onSubmit={handleAdjust} className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 p-4">
          <div>
            <label htmlFor="adjust-variant-search" className="text-xs font-medium text-gray-600">Variant SKU or ID</label>
            <input
              id="adjust-variant-search"
              required
              list="variant-sku-options"
              value={adjustForm.variantSearch}
              onChange={(e) => setAdjustForm((f) => ({ ...f, variantSearch: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
            <datalist id="variant-sku-options">
              {inventory.map((row) => (
                <option key={row.productVariantId} value={row.variantSku} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="adjust-warehouse" className="text-xs font-medium text-gray-600">Warehouse</label>
            <select
              id="adjust-warehouse"
              required
              value={adjustForm.warehouseId}
              onChange={(e) => setAdjustForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            >
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="adjust-quantity" className="text-xs font-medium text-gray-600">Quantity</label>
            <input
              id="adjust-quantity"
              required
              type="number"
              min={1}
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <div>
            <label htmlFor="adjust-type" className="text-xs font-medium text-gray-600">Type</label>
            <select
              id="adjust-type"
              value={adjustForm.type}
              onChange={(e) => setAdjustForm((f) => ({ ...f, type: e.target.value as AdjustType }))}
              className={`mt-1 block ${inputCls()}`}
            >
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUST">ADJUST</option>
            </select>
          </div>
          <div>
            <label htmlFor="adjust-reference" className="text-xs font-medium text-gray-600">Reference (optional)</label>
            <input
              id="adjust-reference"
              value={adjustForm.reference}
              onChange={(e) => setAdjustForm((f) => ({ ...f, reference: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <button
            type="submit"
            disabled={adjustSubmitting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {adjustSubmitting ? 'Adjusting...' : 'Adjust Stock'}
          </button>
        </form>
        {adjustError && <p className="mt-3 text-sm text-red-600">{adjustError}</p>}
        {adjustSuccess && <p className="mt-3 text-sm text-green-700">{adjustSuccess}</p>}
      </section>
    </div>
  );
}
