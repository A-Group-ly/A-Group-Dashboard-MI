'use client';

import { useMemo } from 'react';
import type { Transaction } from '@/types/dashboard';
import { mapApiTransaction, type ApiTransaction } from '@/lib/mapApi';
import { useApp } from './AppProvider';
import { useApiData } from './useApiData';

/**
 * Transactions for the selected period and currency (server-side filtered, tenant-scoped), mapped for the UI.
 * Pass `enabled = false` for roles that may not read transactions: no request is made.
 */
export function useTransactions(limit = 200, enabled = true) {
  const { range, currency } = useApp();
  const url = enabled ? `/api/transactions?${new URLSearchParams({ from: range.from, to: range.to, currency, limit: String(limit) })}` : null;
  const state = useApiData<{ data: ApiTransaction[]; pagination: { total: number } }>(url);
  const rows = useMemo<Transaction[] | null>(() => (state.data ? state.data.data.map(mapApiTransaction) : null), [state.data]);
  return { ...state, rows, total: state.data?.pagination.total ?? 0 };
}
