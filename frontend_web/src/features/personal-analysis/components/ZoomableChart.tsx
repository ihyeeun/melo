import { type ReactNode, useEffect, useRef, useState } from "react";

import styles from "@/features/personal-analysis/styles/LineChart.module.css";

export interface ChartViewport {
  zoom: number;
  scrollLeft: number;
  width: number;
  overlayPortal: HTMLDivElement | null;
}

export function ZoomableChart({
  dayCount,
  children,
}: {
  dayCount: number;
  children: (viewport: ChartViewport) => ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overlayPortal, setOverlayPortal] = useState<HTMLDivElement | null>(null);
  const [view, setView] = useState({ zoom: 1, scrollLeft: 0, width: 0 });
  const maxZoom = Math.max(1, Math.min(8, (dayCount - 1) / 2));

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    let zoom = 1;
    let pinch: { distance: number; zoom: number; anchor: number } | null = null;
    content.style.width = "100%";
    viewport.scrollLeft = 0;

    const updateView = () => {
      const { scrollLeft, clientWidth: width } = viewport;
      setView((previous) =>
        previous.zoom === zoom && previous.scrollLeft === scrollLeft && previous.width === width
          ? previous
          : { zoom, scrollLeft, width },
      );
    };

    const zoomAt = (
      nextZoom: number,
      center: number,
      anchor = (viewport.scrollLeft + center) / zoom,
    ) => {
      zoom = Math.max(1, Math.min(maxZoom, nextZoom));
      content.style.width = `${zoom * 100}%`;
      viewport.scrollLeft = anchor * zoom - center;
      updateView();
    };

    const touchPosition = (event: TouchEvent) => {
      const [first, second] = [event.touches[0], event.touches[1]];
      return {
        distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
        center: (first.clientX + second.clientX) / 2 - viewport.getBoundingClientRect().left,
      };
    };

    const startPinch = (event: TouchEvent) => {
      pinch = null;
      if (event.touches.length !== 2 || maxZoom === 1) return;
      if (event.cancelable) event.preventDefault();
      const { distance, center } = touchPosition(event);
      if (distance > 0) pinch = { distance, zoom, anchor: (viewport.scrollLeft + center) / zoom };
    };

    const movePinch = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinch) return;
      if (event.cancelable) event.preventDefault();
      const { distance, center } = touchPosition(event);
      zoomAt((pinch.zoom * distance) / pinch.distance, center, pinch.anchor);
    };

    const observer = new ResizeObserver(updateView);
    observer.observe(viewport);
    viewport.addEventListener("scroll", updateView, { passive: true });
    viewport.addEventListener("touchstart", startPinch, { passive: false });
    viewport.addEventListener("touchmove", movePinch, { passive: false });
    viewport.addEventListener("touchend", startPinch, { passive: false });
    viewport.addEventListener("touchcancel", startPinch, { passive: false });

    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", updateView);
      viewport.removeEventListener("touchstart", startPinch);
      viewport.removeEventListener("touchmove", movePinch);
      viewport.removeEventListener("touchend", startPinch);
      viewport.removeEventListener("touchcancel", startPinch);
    };
  }, [maxZoom]);

  return (
    <div ref={setOverlayPortal} className={styles.zoomRoot}>
      <div
        ref={viewportRef}
        className={styles.zoomViewport}
        style={{ touchAction: maxZoom > 1 ? "pan-x pan-y" : "auto" }}
        role="region"
        aria-label="분석 차트. 두 손가락으로 확대·축소하고 좌우로 스크롤할 수 있습니다."
        tabIndex={0}
      >
        <div ref={contentRef} className={styles.zoomContent}>
          {children({ ...view, overlayPortal })}
        </div>
      </div>
    </div>
  );
}
