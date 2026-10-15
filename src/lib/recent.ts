/** "Recently viewed" records, remembered in this browser only (never sent anywhere). */
export interface RecentItem {
  href: string;
  label: string;
  kind: 'customer' | 'subscription' | 'invoice';
  at: number;
}

const KEY = 'ag_recent_v1';
const MAX = 8;

export function getRecent(): RecentItem[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x): x is RecentItem => x && typeof x.href === 'string' && x.href.startsWith('/') && typeof x.label === 'string' && ['customer', 'subscription', 'invoice'].includes(x.kind))
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function addRecent(item: Omit<RecentItem, 'at'>): void {
  try {
    const next = [{ ...item, label: item.label.slice(0, 80), at: Date.now() }, ...getRecent().filter((x) => x.href !== item.href)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the list just is not remembered */
  }
}

export function clearRecent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
