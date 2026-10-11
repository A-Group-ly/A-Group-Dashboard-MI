'use client';

import React, { useState } from 'react';
import { Currency, Language, Transaction, PaymentMethod } from '@/types/dashboard';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/calculations';

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  language: Language;
}

const paymentMethodLabels: Record<PaymentMethod, { en: string; ar: string }> = {
  CASH: { en: 'Cash', ar: 'نقدي' },
  LOCAL_CARD: { en: 'Local Card', ar: 'بطاقة محلية' },
  INTERNATIONAL_CARD: { en: 'International Card', ar: 'بطاقة دولية' },
  BANK_TRANSFER: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
  DIGITAL_WALLET: { en: 'Digital Wallet', ar: 'محفظة رقمية' },
  OTHER: { en: 'Other', ar: 'أخرى' },
  NOT_APPLICABLE: { en: 'N/A', ar: 'غير محدد' },
};

export default function TransactionsTable({ transactions, currency, language }: TransactionsTableProps) {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  const filtered = transactions.filter((tx) => {
    if (tx.currency !== currency) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = tx.description.toLowerCase().includes(q) || tx.descriptionAr.includes(q);
      const matchSource = tx.source.toLowerCase().includes(q);
      if (!matchDesc && !matchSource) return false;
    }

    return true;
  });

  const categories = Array.from(new Set(transactions.map((t) => t.category)));
  const paymentMethods = Array.from(new Set(transactions.map((t) => t.paymentMethod)));

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    return language === 'ar' ? paymentMethodLabels[method].ar : paymentMethodLabels[method].en;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.transactionsTitle}
            </h3>
            <p className="text-xs text-slate-500">{t.transactionsSubtitle}</p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="paid">{t.statusPaid}</option>
              <option value="pending">{t.statusPending}</option>
              <option value="upcoming">{t.statusUpcoming}</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">{t.allCategories}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">{t.allPaymentMethods}</option>
              {paymentMethods.map((pm) => (
                <option key={pm} value={pm}>
                  {getPaymentMethodLabel(pm as PaymentMethod)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left rtl:text-right border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">{t.colDescription}</th>
              <th className="py-3 px-4">{t.colPlatform}</th>
              <th className="py-3 px-4">{t.colCategory}</th>
              <th className="py-3 px-4">{t.colDate}</th>
              <th className="py-3 px-4">{t.colStatus}</th>
              <th className="py-3 px-4">{t.colPaymentMethod}</th>
              <th className="py-3 px-4 text-end font-mono">{t.colAmount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {t.noTransactions}
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isPaid = tx.status === 'paid';
                const isUpcoming = tx.status === 'upcoming';
                const isOutflow = tx.type === 'outflow';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {language === 'ar' ? tx.descriptionAr : tx.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                        {tx.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {language === 'ar' ? tx.categoryAr : tx.category}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${{
                          paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
                          upcoming: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
                          pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                        }[tx.status]}`}
                      >
                        {isPaid ? t.statusPaid : isUpcoming ? t.statusUpcoming : t.statusPending}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {getPaymentMethodLabel(tx.paymentMethod)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold">
                      <span className={isOutflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {isOutflow ? '-' : '+'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}