'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface ImportIssue {
  row: number;
  message: string;
}

interface ImportResult {
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

function extractErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message ?? fallback;
}

export default function AdminProductImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleDownloadTemplate() {
    setDownloading(true);
    setError(null);
    try {
      const response = await apiClient.get('/admin/catalog/products/import/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to download the template.'));
    } finally {
      setDownloading(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<ImportResult>('/admin/catalog/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to import products.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bulk-create or update products and variants from a CSV or Excel file — one row per
            variant, grouped by product SKU.
          </p>
        </div>
        <Link href="/admin/products" className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline">
          Back to Products
        </Link>
      </div>

      <div className="rounded-xl2 border border-gray-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {downloading ? 'Preparing template...' : 'Download template'}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || uploading}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {uploading ? 'Importing...' : 'Upload & Import'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl2 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}
      </div>

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 rounded-xl2 border border-gray-200 bg-white p-6 shadow-card sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Products created</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{result.productsCreated}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Products updated</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{result.productsUpdated}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Variants created</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{result.variantsCreated}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Variants updated</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{result.variantsUpdated}</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-rose-700">
                Errors ({result.errors.length}) — these rows were skipped
              </h2>
              <div className="mt-2 overflow-hidden rounded-xl2 border border-rose-200 shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-rose-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-rose-700">
                      <th className="px-4 py-2.5">Row</th>
                      <th className="px-4 py-2.5">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-gray-600">{e.row}</td>
                        <td className="px-4 py-2.5 text-gray-800">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-700">
                Warnings ({result.warnings.length}) — these rows still imported
              </h2>
              <div className="mt-2 overflow-hidden rounded-xl2 border border-amber-200 shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-amber-700">
                      <th className="px-4 py-2.5">Row</th>
                      <th className="px-4 py-2.5">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {result.warnings.map((w, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-gray-600">{w.row}</td>
                        <td className="px-4 py-2.5 text-gray-800">{w.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length === 0 && result.warnings.length === 0 && (
            <div className="rounded-xl2 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              Import completed with no errors or warnings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
