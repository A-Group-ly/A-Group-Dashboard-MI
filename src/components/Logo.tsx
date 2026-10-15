import React from 'react';

/**
 * Official A-Group mark. The PNG is used only as an alpha mask over `currentColor`, so the background
 * is transparent and the mark follows the theme (dark ink on light surfaces, light ink on dark ones).
 */
export default function Logo({ className = 'h-9 w-auto', title = 'A-Group' }: { className?: string; title?: string }) {
  const mask = "url('/logo-mark.png') center / contain no-repeat";
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ aspectRatio: '480 / 436', WebkitMask: mask, mask }}
    />
  );
}
