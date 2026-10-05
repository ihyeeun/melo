import { startOfMonth, subMonths } from "date-fns";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

export function usePastCalendarMonths() {
  const [months, setMonths] = useState(() => {
    const currentMonth = startOfMonth(new Date());

    return [2, 1, 0].map((offset) => formatDateKey(subMonths(currentMonth, offset)));
  });
  const scrollRef = useRef<HTMLElement>(null);
  const loadOlderRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const previousHeightRef = useRef<number | null>(null);

  const addOlderMonth = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || previousHeightRef.current !== null) return;

    // 기록 유무와 관계없이 달력을 한 달 추가한다. 조회는 연간 범위를 벗어날 때만 늘린다.
    previousHeightRef.current = scroll.scrollHeight;
    setMonths((current) => [
      formatDateKey(subMonths(parseDateKey(current[0]), 1)),
      ...current,
    ]);
  }, []);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    if (!initializedRef.current) {
      scroll.scrollTop = scroll.scrollHeight;
      initializedRef.current = true;
      return;
    }

    if (previousHeightRef.current !== null) {
      // 위에 추가된 높이만큼 이동해 기존에 보고 있던 날짜의 위치를 유지한다.
      scroll.scrollTop += scroll.scrollHeight - previousHeightRef.current;
      previousHeightRef.current = null;
    }
  }, [months.length]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = loadOlderRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) addOlderMonth();
      },
      { root, rootMargin: "160px 0px 0px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [addOlderMonth, months.length]);

  return { months, scrollRef, loadOlderRef, addOlderMonth };
}
