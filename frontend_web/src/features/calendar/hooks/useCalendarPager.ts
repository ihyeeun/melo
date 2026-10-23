import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type UseCalendarPagerParams = {
  currentPageIndex: number;
  currentPageKey: string;
  onPageChange: (pageIndex: number) => void;
  pageCount: number;
};

const SCROLL_SETTLE_DELAY_MS = 80;

export function useCalendarPager({
  currentPageIndex,
  currentPageKey,
  onPageChange,
  pageCount,
}: UseCalendarPagerParams) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settleCurrentPage = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || viewport.clientWidth === 0) return;

    const nearestPageIndex = Math.max(
      0,
      Math.min(pageCount - 1, Math.round(viewport.scrollLeft / viewport.clientWidth)),
    );

    if (nearestPageIndex !== currentPageIndex) {
      onPageChange(nearestPageIndex);
    }
  }, [currentPageIndex, onPageChange, pageCount]);

  const handleScroll = () => {
    if (scrollEndTimerRef.current !== null) {
      clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = setTimeout(() => {
      scrollEndTimerRef.current = null;
      settleCurrentPage();
    }, SCROLL_SETTLE_DELAY_MS);
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const alignCurrentPage = () => {
      viewport.scrollLeft = viewport.clientWidth * currentPageIndex;
    };

    alignCurrentPage();

    if (typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(alignCurrentPage);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [currentPageIndex, currentPageKey, pageCount]);

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current !== null) {
        clearTimeout(scrollEndTimerRef.current);
      }
    };
  }, []);

  return {
    handleScroll,
    viewportRef,
  };
}
