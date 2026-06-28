import { ScrollFog as SeedScrollFog, type ScrollFogProps as SeedScrollFogProps } from "@seed-design/react";
import {
  forwardRef,
  type Ref,
  type UIEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./ScrollFogArea.module.css";

export type ScrollFogPlacement = NonNullable<SeedScrollFogProps["placement"]>[number];

export type ScrollFogAreaProps = Omit<SeedScrollFogProps, "placement"> & {
  enabled?: boolean;
  dynamicPlacement?: boolean;
  placement?: ScrollFogPlacement[];
};

const DEFAULT_PLACEMENT: ScrollFogPlacement[] = ["top", "bottom"];
const DEFAULT_SIZES = { top: 20, bottom: 80 } satisfies NonNullable<
  SeedScrollFogProps["sizes"]
>;
const SCROLL_EDGE_THRESHOLD = 1;

function mergeClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function setForwardedRef<T>(ref: Ref<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function areSamePlacements(prev: ScrollFogPlacement[], next: ScrollFogPlacement[]) {
  return prev.length === next.length && prev.every((placement, index) => placement === next[index]);
}

function getDynamicPlacement(element: HTMLElement, placement: ScrollFogPlacement[]) {
  const maxScrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
  const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
  const isScrollableVertically = maxScrollTop > SCROLL_EDGE_THRESHOLD;
  const isScrollableHorizontally = maxScrollLeft > SCROLL_EDGE_THRESHOLD;
  const visibility: Record<ScrollFogPlacement, boolean> = {
    top: isScrollableVertically && element.scrollTop > SCROLL_EDGE_THRESHOLD,
    bottom:
      isScrollableVertically && element.scrollTop < maxScrollTop - SCROLL_EDGE_THRESHOLD,
    left: isScrollableHorizontally && element.scrollLeft > SCROLL_EDGE_THRESHOLD,
    right:
      isScrollableHorizontally && element.scrollLeft < maxScrollLeft - SCROLL_EDGE_THRESHOLD,
  };

  return placement.filter((side) => visibility[side]);
}

export const ScrollFogArea = forwardRef<HTMLDivElement, ScrollFogAreaProps>(
  (
    {
      children,
      className,
      dynamicPlacement = true,
      enabled = true,
      hideScrollBar = true,
      onScroll,
      placement,
      size,
      sizes = DEFAULT_SIZES,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const elementRef = useRef<HTMLDivElement | null>(null);
    const frameIdRef = useRef<number | null>(null);
    const allowedPlacement = useMemo(() => placement ?? DEFAULT_PLACEMENT, [placement]);
    const [visiblePlacement, setVisiblePlacement] = useState<ScrollFogPlacement[]>([]);

    const setElementRef = useCallback(
      (element: HTMLDivElement | null) => {
        elementRef.current = element;
        setForwardedRef(forwardedRef, element);
      },
      [forwardedRef],
    );

    const updatePlacement = useCallback(() => {
      frameIdRef.current = null;

      if (!enabled || !dynamicPlacement) {
        return;
      }

      const element = elementRef.current;
      if (!element) return;

      const nextPlacement = getDynamicPlacement(element, allowedPlacement);
      setVisiblePlacement((prevPlacement) =>
        areSamePlacements(prevPlacement, nextPlacement) ? prevPlacement : nextPlacement,
      );
    }, [allowedPlacement, dynamicPlacement, enabled]);

    const schedulePlacementUpdate = useCallback(() => {
      if (!enabled || !dynamicPlacement || frameIdRef.current !== null) {
        return;
      }

      frameIdRef.current = window.requestAnimationFrame(updatePlacement);
    }, [dynamicPlacement, enabled, updatePlacement]);

    const handleScroll = useCallback(
      (event: UIEvent<HTMLDivElement>) => {
        schedulePlacementUpdate();
        onScroll?.(event);
      },
      [onScroll, schedulePlacementUpdate],
    );

    useLayoutEffect(() => {
      if (!enabled || !dynamicPlacement) return;

      const element = elementRef.current;
      if (!element) return;

      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(schedulePlacementUpdate);
      const mutationObserver =
        typeof MutationObserver === "undefined"
          ? null
          : new MutationObserver(schedulePlacementUpdate);

      resizeObserver?.observe(element);
      mutationObserver?.observe(element, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
      element.addEventListener("load", schedulePlacementUpdate, true);
      window.addEventListener("resize", schedulePlacementUpdate);

      schedulePlacementUpdate();

      return () => {
        if (frameIdRef.current !== null) {
          window.cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = null;
        }

        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        element.removeEventListener("load", schedulePlacementUpdate, true);
        window.removeEventListener("resize", schedulePlacementUpdate);
      };
    }, [allowedPlacement, dynamicPlacement, enabled, schedulePlacementUpdate]);

    const rootClassName = mergeClassNames(
      styles.root,
      hideScrollBar && styles.hideScrollBar,
      className,
    );

    if (!enabled) {
      return (
        <div ref={setElementRef} className={rootClassName} onScroll={onScroll} style={style} {...props}>
          {children}
        </div>
      );
    }

    return (
      <SeedScrollFog
        ref={setElementRef}
        className={rootClassName}
        hideScrollBar={hideScrollBar}
        onScroll={handleScroll}
        placement={dynamicPlacement ? visiblePlacement : allowedPlacement}
        size={size}
        sizes={sizes}
        style={style}
        {...props}
      >
        {children}
      </SeedScrollFog>
    );
  },
);

ScrollFogArea.displayName = "ScrollFogArea";
