'use client';

import React, { createContext, useContext } from 'react';

/** The search text of the table (or list) the cell belongs to, so matching parts can be highlighted. */
export const SearchQueryContext = createContext<string>('');

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps every match of `query` (case-insensitive) in <mark>. Safe for any text: nothing is parsed as HTML. */
export function Highlight({ text, query }: { text: string | null | undefined; query: string }) {
  const value = text ?? '';
  const q = query.trim();
  if (!q || !value) return <>{value}</>;
  const parts = value.split(new RegExp(`(${escapeRe(q)})`, 'ig'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-inherit [text-decoration:inherit]">{p}</mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}

/** Highlight using the surrounding table's search text. */
export function Hl({ text }: { text: string | null | undefined }) {
  return <Highlight text={text} query={useContext(SearchQueryContext)} />;
}
