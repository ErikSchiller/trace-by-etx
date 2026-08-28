import { useEffect } from 'react';

const BRAND = 'TRACE';
const HOME_TITLE = 'TRACE by ETX — Tu diario de trading en español';

/**
 * Sets document.title to "<page> — TRACE" while mounted (or the branded home
 * title when no page is given), restoring the previous title on unmount.
 *
 * Pass `null` to skip entirely (no set, no restore) — used by the app layout
 * on dynamic routes so a child page can own the title (e.g. a firm name).
 */
export function usePageTitle(page?: string | null) {
  useEffect(() => {
    if (page === null) return;
    const prev = document.title;
    document.title = page ? `${page} — ${BRAND}` : HOME_TITLE;
    return () => { document.title = prev; };
  }, [page]);
}

export default usePageTitle;
