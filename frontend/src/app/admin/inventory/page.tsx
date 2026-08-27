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

type AdjustType = 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'EXPIRE';

type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

interface StockTransfer {
  id: string;
  transferNumber: string;
  productVariantId: string;
  variantSku: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  quantity: number;
  status: TransferStatus;
  note: string | null;
  createdAt: string;
}

type CycleCountStatus = 'OPEN' | 'COMPLETED';

interface CycleCount {
  id: string;
  warehouseId: string;
  warehouseName: string;
  productVariantId: string;
  variantSku: string;
  expectedQuantity: number;
  actualQuantity: number | null;
  discrepancy: number | null;
  status: CycleCountStatus;
  createdAt: string;
}

function inputCls() {
  return 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';
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

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [transfersError, setTransfersError] = useState<string | null>(null);
  const [transferActionError, setTransferActionError] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState({
    variantSearch: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: '',
    note: '',
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [cycleCountsLoading, setCycleCountsLoading] = useState(true);
  const [cycleCountsError, setCycleCountsError] = useState<string | null>(null);
  const [cycleCountActionError, setCycleCountActionError] = useState<string | null>(null);
  const [cycleCountForm, setCycleCountForm] = useState({ warehouseId: '', variantSearch: '' });
  const [cycleCountSubmitting, setCycleCountSubmitting] = useState(false);
  const [cycleCountError, setCycleCountError] = useState<string | null>(null);
  const [cycleCountSuccess, setCycleCountSuccess] = useState<string | null>(null);
  // id of the cycle count currently showing its inline "actual quantity" input, and the typed value
  const [completingCountId, setCompletingCountId] = useState<string | null>(null);
  const [completingCountValue, setCompletingCountValue] = useState('');

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

  function loadTransfers() {
    setTransfersLoading(true);
    apiClient
      .get('/admin/inventory/transfers', { params: { pageSize: 100 } })
      .then(({ data }) => setTransfers(data.items))
      .catch((err) => setTransfersError(extractErrorMessage(err, 'Failed to load stock transfers.')))
      .finally(() => setTransfersLoading(false));
  }

  function loadCycleCounts() {
    setCycleCountsLoading(true);
    apiClient
      .get('/admin/inventory/cycle-counts', { params: { pageSize: 100 } })
      .then(({ data }) => setCycleCounts(data.items))
      .catch((err) => setCycleCountsError(extractErrorMessage(err, 'Failed to load cycle counts.')))
      .finally(() => setCycleCountsLoading(false));
  }

  useEffect(loadWarehouses, []);
  useEffect(loadInventory, [lowStockOnly]);
  useEffect(loadTransfers, []);
  useEffect(loadCycleCounts, []);

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
    if ((adjustForm.type === 'DAMAGE' || adjustForm.type === 'EXPIRE') && !adjustForm.reference.trim()) {
      setAdjustError('A reference/reason is required for DAMAGE and EXPIRE write-offs.');
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

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferSubmitting(true);
    setTransferError(null);
    setTransferSuccess(null);

    const searchValue = transferForm.variantSearch.trim();
    const productVariantId = skuToVariantId.get(searchValue) ?? searchValue;

    if (!productVariantId || !transferForm.fromWarehouseId || !transferForm.toWarehouseId || !transferForm.quantity) {
      setTransferError('Variant, from/to warehouse, and quantity are required.');
      setTransferSubmitting(false);
      return;
    }
    if (transferForm.fromWarehouseId === transferForm.toWarehouseId) {
      setTransferError('From and to warehouse must be different.');
      setTransferSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/admin/inventory/transfers', {
        productVariantId,
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        quantity: Number(transferForm.quantity),
        note: transferForm.note || undefined,
      });
      setTransferSuccess('Transfer created.');
      setTransferForm({ variantSearch: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' });
      loadTransfers();
    } catch (err: any) {
      setTransferError(extractErrorMessage(err, 'Failed to create transfer.'));
    } finally {
      setTransferSubmitting(false);
    }
  }

  async function handleMarkInTransit(id: string) {
    setTransferActionError(null);
    try {
      await apiClient.post(`/admin/inventory/transfers/${id}/in-transit`);
      loadTransfers();
    } catch (err: any) {
      setTransferActionError(extractErrorMessage(err, 'Failed to mark transfer in-transit.'));
    }
  }

  async function handleCompleteTransfer(id: string) {
    setTransferActionError(null);
    try {
      await apiClient.post(`/admin/inventory/transfers/${id}/complete`);
      loadTransfers();
      loadInventory();
    } catch (err: any) {
      setTransferActionError(extractErrorMessage(err, 'Failed to complete transfer.'));
    }
  }

  async function handleCancelTransfer(id: string) {
    setTransferActionError(null);
    try {
      await apiClient.post(`/admin/inventory/transfers/${id}/cancel`);
      loadTransfers();
    } catch (err: any) {
      setTransferActionError(extractErrorMessage(err, 'Failed to cancel transfer.'));
    }
  }

  async function handleStartCycleCount(e: React.FormEvent) {
    e.preventDefault();
    setCycleCountSubmitting(true);
    setCycleCountError(null);
    setCycleCountSuccess(null);

    const searchValue = cycleCountForm.variantSearch.trim();
    const productVariantId = skuToVariantId.get(searchValue) ?? searchValue;

    if (!productVariantId || !cycleCountForm.warehouseId) {
      setCycleCountError('Warehouse and variant are required.');
      setCycleCountSubmitting(false);
      return;
    }

    try {
      await apiClient.post('/admin/inventory/cycle-counts', {
        warehouseId: cycleCountForm.warehouseId,
        productVariantId,
      });
      setCycleCountSuccess('Cycle count started.');
      setCycleCountForm({ warehouseId: '', variantSearch: '' });
      loadCycleCounts();
    } catch (err: any) {
      setCycleCountError(extractErrorMessage(err, 'Failed to start cycle count.'));
    } finally {
      setCycleCountSubmitting(false);
    }
  }

  function openCompleteCycleCount(id: string) {
    setCompletingCountId(id);
    setCompletingCountValue('');
    setCycleCountActionError(null);
  }

  async function handleCompleteCycleCount(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (completingCountValue === '') {
      setCycleCountActionError('Enter the counted quantity.');
      return;
    }
    setCycleCountActionError(null);
    try {
      await apiClient.post(`/admin/inventory/cycle-counts/${id}/complete`, {
        actualQuantity: Number(completingCountValue),
      });
      setCompletingCountId(null);
      setCompletingCountValue('');
      loadCycleCounts();
      loadInventory();
    } catch (err: any) {
      setCycleCountActionError(extractErrorMessage(err, 'Failed to complete cycle count.'));
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Inventory &amp; Warehouses</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Warehouses</h2>
        <form
          onSubmit={handleCreateWarehouse}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-xl2 border border-gray-200 bg-white p-4 shadow-card"
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
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            Add Warehouse
          </button>
        </form>

        {warehouseError && <p className="mt-3 text-sm text-rose-600">{warehouseError}</p>}

        {warehouses.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No warehouses yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl2 border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Address</th>
                  <th className="px-4 py-2.5">Default</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouses.map((w) => (
                  <tr key={w.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{w.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{w.code}</td>
                    <td className="px-4 py-2.5 text-gray-600">{w.address ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{w.isDefault ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteWarehouse(w.id)}
                        className="font-medium text-rose-600 hover:text-rose-700 hover:underline"
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

        {inventoryError && <p className="mt-3 text-sm text-rose-600">{inventoryError}</p>}

        {inventoryLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No inventory records yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl2 border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Variant SKU</th>
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5">On Hand</th>
                  <th className="px-4 py-2.5">Reserved</th>
                  <th className="px-4 py-2.5">Available</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.map((row) => (
                  <tr key={row.id} className={`transition-colors hover:bg-gray-50 ${row.isLowStock ? 'bg-rose-50' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-800">{row.productName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.variantSku}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.warehouseName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.quantityOnHand}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.quantityReserved}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.available}</td>
                    <td className="px-4 py-2.5">
                      {row.isLowStock ? (
                        <span className="font-medium text-rose-600">Low stock</span>
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
        <form onSubmit={handleAdjust} className="mt-3 flex flex-wrap items-end gap-3 rounded-xl2 border border-gray-200 bg-white p-4 shadow-card">
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
              <option value="DAMAGE">DAMAGE</option>
              <option value="EXPIRE">EXPIRE</option>
            </select>
          </div>
          <div>
            <label htmlFor="adjust-reference" className="text-xs font-medium text-gray-600">
              Reference {adjustForm.type === 'DAMAGE' || adjustForm.type === 'EXPIRE' ? '(required)' : '(optional)'}
            </label>
            <input
              id="adjust-reference"
              required={adjustForm.type === 'DAMAGE' || adjustForm.type === 'EXPIRE'}
              placeholder={adjustForm.type === 'DAMAGE' || adjustForm.type === 'EXPIRE' ? 'Reason for write-off' : undefined}
              value={adjustForm.reference}
              onChange={(e) => setAdjustForm((f) => ({ ...f, reference: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <button
            type="submit"
            disabled={adjustSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {adjustSubmitting ? 'Adjusting...' : 'Adjust Stock'}
          </button>
        </form>
        {adjustError && <p className="mt-3 text-sm text-rose-600">{adjustError}</p>}
        {adjustSuccess && <p className="mt-3 text-sm text-emerald-700">{adjustSuccess}</p>}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Stock Transfers</h2>
        <form
          onSubmit={handleCreateTransfer}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-xl2 border border-gray-200 bg-white p-4 shadow-card"
        >
          <div>
            <label htmlFor="transfer-variant-search" className="text-xs font-medium text-gray-600">
              Variant SKU or ID
            </label>
            <input
              id="transfer-variant-search"
              required
              list="variant-sku-options"
              value={transferForm.variantSearch}
              onChange={(e) => setTransferForm((f) => ({ ...f, variantSearch: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <div>
            <label htmlFor="transfer-from-warehouse" className="text-xs font-medium text-gray-600">
              From warehouse
            </label>
            <select
              id="transfer-from-warehouse"
              required
              value={transferForm.fromWarehouseId}
              onChange={(e) => setTransferForm((f) => ({ ...f, fromWarehouseId: e.target.value }))}
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
            <label htmlFor="transfer-to-warehouse" className="text-xs font-medium text-gray-600">
              To warehouse
            </label>
            <select
              id="transfer-to-warehouse"
              required
              value={transferForm.toWarehouseId}
              onChange={(e) => setTransferForm((f) => ({ ...f, toWarehouseId: e.target.value }))}
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
            <label htmlFor="transfer-quantity" className="text-xs font-medium text-gray-600">
              Quantity
            </label>
            <input
              id="transfer-quantity"
              required
              type="number"
              min={1}
              value={transferForm.quantity}
              onChange={(e) => setTransferForm((f) => ({ ...f, quantity: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <div>
            <label htmlFor="transfer-note" className="text-xs font-medium text-gray-600">
              Note (optional)
            </label>
            <input
              id="transfer-note"
              value={transferForm.note}
              onChange={(e) => setTransferForm((f) => ({ ...f, note: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <button
            type="submit"
            disabled={transferSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {transferSubmitting ? 'Creating...' : 'Create Transfer'}
          </button>
        </form>
        {transferError && <p className="mt-3 text-sm text-rose-600">{transferError}</p>}
        {transferSuccess && <p className="mt-3 text-sm text-emerald-700">{transferSuccess}</p>}
        {transferActionError && <p className="mt-3 text-sm text-rose-600">{transferActionError}</p>}
        {transfersError && <p className="mt-3 text-sm text-rose-600">{transfersError}</p>}

        {transfersLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading transfers...</p>
        ) : transfers.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No stock transfers yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl2 border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Number</th>
                  <th className="px-4 py-2.5">Variant SKU</th>
                  <th className="px-4 py-2.5">From → To</th>
                  <th className="px-4 py-2.5">Quantity</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">{t.transferNumber}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.variantSku}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {t.fromWarehouseName} → {t.toWarehouseName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{t.quantity}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.status}</td>
                    <td className="px-4 py-2.5 text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-3">
                        {t.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkInTransit(t.id)}
                            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
                          >
                            Mark In-Transit
                          </button>
                        )}
                        {(t.status === 'PENDING' || t.status === 'IN_TRANSIT') && (
                          <button
                            onClick={() => handleCompleteTransfer(t.id)}
                            className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                          >
                            Complete
                          </button>
                        )}
                        {(t.status === 'PENDING' || t.status === 'IN_TRANSIT') && (
                          <button
                            onClick={() => handleCancelTransfer(t.id)}
                            className="font-medium text-rose-600 hover:text-rose-700 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Cycle Counts</h2>
        <form
          onSubmit={handleStartCycleCount}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-xl2 border border-gray-200 bg-white p-4 shadow-card"
        >
          <div>
            <label htmlFor="cyclecount-warehouse" className="text-xs font-medium text-gray-600">
              Warehouse
            </label>
            <select
              id="cyclecount-warehouse"
              required
              value={cycleCountForm.warehouseId}
              onChange={(e) => setCycleCountForm((f) => ({ ...f, warehouseId: e.target.value }))}
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
            <label htmlFor="cyclecount-variant-search" className="text-xs font-medium text-gray-600">
              Variant SKU or ID
            </label>
            <input
              id="cyclecount-variant-search"
              required
              list="variant-sku-options"
              value={cycleCountForm.variantSearch}
              onChange={(e) => setCycleCountForm((f) => ({ ...f, variantSearch: e.target.value }))}
              className={`mt-1 block ${inputCls()}`}
            />
          </div>
          <button
            type="submit"
            disabled={cycleCountSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {cycleCountSubmitting ? 'Starting...' : 'Start Count'}
          </button>
        </form>
        {cycleCountError && <p className="mt-3 text-sm text-rose-600">{cycleCountError}</p>}
        {cycleCountSuccess && <p className="mt-3 text-sm text-emerald-700">{cycleCountSuccess}</p>}
        {cycleCountActionError && <p className="mt-3 text-sm text-rose-600">{cycleCountActionError}</p>}
        {cycleCountsError && <p className="mt-3 text-sm text-rose-600">{cycleCountsError}</p>}

        {cycleCountsLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading cycle counts...</p>
        ) : cycleCounts.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No cycle counts yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl2 border border-gray-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">Warehouse</th>
                  <th className="px-4 py-2.5">Variant SKU</th>
                  <th className="px-4 py-2.5">Expected</th>
                  <th className="px-4 py-2.5">Actual</th>
                  <th className="px-4 py-2.5">Discrepancy</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cycleCounts.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">{c.warehouseName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.variantSku}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.expectedQuantity}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.actualQuantity ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.discrepancy ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.status}</td>
                    <td className="px-4 py-2.5 text-right">
                      {c.status === 'OPEN' &&
                        (completingCountId === c.id ? (
                          <form
                            onSubmit={(e) => handleCompleteCycleCount(e, c.id)}
                            className="flex items-center justify-end gap-2"
                          >
                            <label htmlFor={`cyclecount-actual-${c.id}`} className="sr-only">
                              Actual quantity for {c.variantSku}
                            </label>
                            <input
                              id={`cyclecount-actual-${c.id}`}
                              required
                              type="number"
                              min={0}
                              autoFocus
                              value={completingCountValue}
                              onChange={(e) => setCompletingCountValue(e.target.value)}
                              className={`w-24 ${inputCls()}`}
                            />
                            <button type="submit" className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline">
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setCompletingCountId(null)}
                              className="font-medium text-gray-500 hover:text-gray-700 hover:underline"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <button
                            onClick={() => openCompleteCycleCount(c.id)}
                            className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
                          >
                            Complete
                          </button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
