'use client';

import { useEffect } from 'react';
import { addRecent, type RecentItem } from '@/lib/recent';

/** Render inside a detail page once its data has loaded: remembers it for the search box's "Recently viewed". */
export default function TrackRecent({ kind, href, label }: { kind: RecentItem['kind']; href: string; label: string }) {
  useEffect(() => {
    addRecent({ kind, href, label });
  }, [kind, href, label]);
  return null;
}
