import { csvText } from '../csv';
import { can } from '../permissions';
import type { Access } from './access';

export const CSV_MAX_ROWS = 5000;

/** CSV download built on the server from the SAME tenant-scoped, filtered query as the table. */
export function csvResponse(filename: string, headers: string[], rows: (string | number | null)[][]): Response {
  const lines = rows.map((r) => [...r.map((v) => (typeof v === 'number' ? String(v) : csvText(v))), csvText('DEMO — fictional data')].join(','));
  const body = ['﻿' + [...headers, 'DataSet'].map(csvText).join(','), ...lines].join('\r\n');
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export const canExport = (access: Access) => can(access.role, 'export:csv');
