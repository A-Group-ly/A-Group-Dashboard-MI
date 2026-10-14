import React from 'react';

/**
 * A-Group mark as inline SVG: transparent background and `currentColor`, so it follows the theme
 * (dark ink on light surfaces, light ink on dark surfaces) with no white box.
 * Placeholder drawing of the brand "A": replace the paths with the official SVG when available.
 */
export default function Logo({ className = 'h-9 w-auto', title = 'A-Group' }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={title} className={className} fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
      <title>{title}</title>
      {/* left leg and apex */}
      <path d="M14 106 L52 20 Q60 6 68 20" />
      {/* right leg sweeping into a curved foot */}
      <path d="M68 20 L96 82 Q100 92 108 94" />
      {/* swooping crossbar */}
      <path d="M36 80 Q66 86 90 66" />
    </svg>
  );
}
