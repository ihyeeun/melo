import { useLayoutEffect, useRef, useState } from "react";

import styles from "@/features/diary/styles/MealMenuPreview.module.css";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";

type MealMenuPreviewProps = {
  menus: readonly Pick<MenuWithQuantity, "id" | "name">[];
};

export default function MealMenuPreview({ menus }: MealMenuPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLParagraphElement>(null);
  const [visibleMenuCount, setVisibleMenuCount] = useState(menus.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const more = moreRef.current;

    if (!container || !measurement || !more) return;

    const menuElements = Array.from(measurement.children).slice(0, menus.length);

    const updateVisibleMenuCount = () => {
      const availableHeight = container.getBoundingClientRect().height;

      if (availableHeight <= 0) return;

      const measurementTop = measurement.getBoundingClientRect().top;
      const menuBottoms = menuElements.map(
        (element) => element.getBoundingClientRect().bottom - measurementTop,
      );
      const totalMenuHeight = menuBottoms.at(-1) ?? 0;
      let nextVisibleMenuCount = menus.length;

      // Only reserve the counter's height and spacing when the full list overflows.
      if (totalMenuHeight > availableHeight) {
        const moreHeight = more.getBoundingClientRect().bottom - measurementTop - totalMenuHeight;
        const availableMenuHeight = availableHeight - moreHeight;
        nextVisibleMenuCount = 0;

        for (const menuBottom of menuBottoms) {
          if (menuBottom > availableMenuHeight) break;
          nextVisibleMenuCount += 1;
        }
      }

      setVisibleMenuCount(nextVisibleMenuCount);
    };

    updateVisibleMenuCount();

    const observer = new ResizeObserver(updateVisibleMenuCount);
    observer.observe(container);
    observer.observe(more);
    menuElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [menus]);

  const visibleMenus = menus.slice(0, visibleMenuCount);
  const hiddenMenuCount = menus.length - visibleMenus.length;

  return (
    <div ref={containerRef} className={styles.root}>
      {/* Keep every menu measurable without affecting the visible layout or accessibility tree. */}
      <div ref={measurementRef} className={styles.measurement} aria-hidden="true">
        {menus.map((menu) => (
          <p key={menu.id} className={`${styles.menuName} body-s-medium text-primary`}>
            {menu.name}
          </p>
        ))}
        <p ref={moreRef} className={`${styles.more} caption-m-regular text-tertiary`}>
          외 {menus.length}개 메뉴
        </p>
      </div>

      {visibleMenus.map((menu) => (
        <p key={menu.id} className={`${styles.menuName} body-s-medium text-primary`}>
          {menu.name}
        </p>
      ))}
      {hiddenMenuCount > 0 && (
        <p className={`${styles.more} caption-m-regular text-tertiary`}>
          {visibleMenus.length > 0 ? "외" : "총"} {hiddenMenuCount}개 메뉴
        </p>
      )}
    </div>
  );
}
