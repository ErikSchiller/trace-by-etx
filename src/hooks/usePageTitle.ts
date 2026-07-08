import { useEffect } from 'react';

const SUFFIX = 'TRACE by ETX';

/**
 * Sets document.title to "<page> — TRACE by ETX" while mounted,
 * restoring the previous title on unmount.
 */
export function usePageTitle(page?: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = page ? `${page} — ${SUFFIX}` : `${SUFFIX} — El journal de trading más completo en español`;
    return () => { document.title = prev; };
  }, [page]);
}

export default usePageTitle;
