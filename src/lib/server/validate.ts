import { isIsoDate } from '../period.ts';

/**
 * Small, dependency-free request validation. Every writer route reads its body through a Reader so that
 * unknown fields are ignored, strings are trimmed and bounded, enums are whitelisted and money is exact.
 */
export type FieldErrors = Record<string, string>;

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class Reader {
  readonly errors: FieldErrors = {};
  private body: Record<string, unknown>;

  constructor(body: unknown) {
    this.body = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  }

  get ok() {
    return Object.keys(this.errors).length === 0;
  }

  has(key: string) {
    return this.body[key] !== undefined;
  }

  private fail(key: string, msg: string) {
    this.errors[key] = msg;
    return undefined;
  }

  str(key: string, o: { min?: number; max: number; required?: boolean }): string | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || raw === '') return o.required ? this.fail(key, 'required') : undefined;
    if (typeof raw !== 'string') return this.fail(key, 'invalid');
    const v = raw.trim();
    if (CONTROL.test(v)) return this.fail(key, 'invalid');
    if (v.length < (o.min ?? (o.required ? 1 : 0))) return this.fail(key, 'too_short');
    if (v.length > o.max) return this.fail(key, 'too_long');
    return v;
  }

  /** Optional string that may be cleared with an empty value: returns null for "", undefined if absent. */
  nullableStr(key: string, max: number): string | null | undefined {
    if (this.body[key] === undefined) return undefined;
    if (this.body[key] === null || this.body[key] === '') return null;
    return this.str(key, { max }) ?? null;
  }

  email(key: string, required = true): string | undefined {
    const v = this.str(key, { max: 160, required });
    if (v === undefined) return undefined;
    return EMAIL.test(v) ? v.toLowerCase() : this.fail(key, 'invalid_email');
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], required = true): T | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || raw === '') return required ? this.fail(key, 'required') : undefined;
    return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : this.fail(key, 'invalid');
  }

  date(key: string, required = true): string | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || raw === '') return required ? this.fail(key, 'required') : undefined;
    return typeof raw === 'string' && isIsoDate(raw) ? raw : this.fail(key, 'invalid_date');
  }

  /** Positive money with at most two decimals. */
  money(key: string, required = true): number | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || raw === '') return required ? this.fail(key, 'required') : undefined;
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+(\.\d{1,2})?$/.test(raw.trim()) ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000_000) return this.fail(key, 'invalid_amount');
    return Math.round(n * 100) / 100 === n ? n : this.fail(key, 'invalid_amount');
  }

  int(key: string, o: { min: number; max: number }, required = true): number | undefined {
    const raw = this.body[key];
    if (raw === undefined || raw === null || raw === '') return required ? this.fail(key, 'required') : undefined;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isInteger(n) && n >= o.min && n <= o.max ? n : this.fail(key, 'invalid');
  }
}

/** Parse a JSON body, tolerating empty / malformed input (returns an empty object). */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
