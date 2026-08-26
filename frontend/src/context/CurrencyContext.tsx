'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

// DISPLAY-only currency preference (spec section 25, P1 slice). Rates come from the public
// GET /currency/rates endpoint; `rate` = units of the target currency per 1 VND (see
// backend schema.prisma comment on ExchangeRate). Cart/checkout/orders always settle in
// VND regardless of `selected` — this context only drives what price shoppers *see*.

export interface CurrencyRate {
  targetCurrency: string;
  rate: number;
}

interface CurrencyContextValue {
  selected: string;
  rates: CurrencyRate[];
  setSelected: (code: string) => void;
  /** Convenience lookup: the configured rate for a currency code, or null if unknown. */
  getRate: (code: string) => number | null;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = 'pc_currency';
const VND_ONLY: CurrencyRate[] = [{ targetCurrency: 'VND', rate: 1 }];

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelectedState] = useState('VND');
  const [rates, setRates] = useState<CurrencyRate[]>(VND_ONLY);

  useEffect(() => {
    apiClient
      .get('/currency/rates')
      .then(({ data }) => {
        setRates(Array.isArray(data) && data.length > 0 ? data : VND_ONLY);
      })
      .catch(() => setRates(VND_ONLY));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSelectedState(stored);
    } catch {
      // localStorage unavailable (SSR / privacy mode) — fall back to VND
    }
  }, []);

  const setSelected = useCallback((code: string) => {
    setSelectedState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore — selection just won't survive a reload
    }
  }, []);

  const getRate = useCallback(
    (code: string) => rates.find((r) => r.targetCurrency === code)?.rate ?? null,
    [rates],
  );

  return (
    <CurrencyContext.Provider value={{ selected, rates, setSelected, getRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
