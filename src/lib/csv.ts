import type { Transaction } from '@/types/dashboard';

/**
 * Quote a CSV text field. Values that start with a formula trigger (= + - @ tab CR) are prefixed
 * with an apostrophe so spreadsheet apps do not execute them (CSV / formula injection).
 */
export function csvText(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(rows: Transaction[]): string {
  const header = ['Reference', 'Date', 'Description', 'Platform', 'Category', 'Type', 'Status', 'PaymentMethod', 'Currency', 'Amount', 'DataSet'];
  const lines = rows.map((r) =>
    [
      csvText(r.id),
      csvText(r.date),
      csvText(r.description),
      csvText(r.source),
      csvText(r.category),
      csvText(r.type === 'inflow' ? 'income' : 'expense'),
      csvText(r.status),
      csvText(r.paymentMethod),
      csvText(r.currency),
      String(r.amount), // numeric: left unquoted so it stays a number
      csvText('DEMO — fictional data'),
    ].join(',')
  );
  return [header.map(csvText).join(','), ...lines].join('\r\n');
}

/** Trigger a browser download. UTF-8 BOM keeps Arabic text readable in Excel. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
