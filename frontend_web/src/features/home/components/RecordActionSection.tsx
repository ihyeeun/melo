import { useLayoutEffect, useRef, useState } from "react";

import Tile from "@/features/home/components/cards/Tile";
import TodayBodyLogSection from "@/features/home/components/TodayBodyLogSection";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useTodayRecordQuery";
import styles from "@/features/home/styles/RecordActionSection.module.css";
import type { MenuWithQuantity } from "@/features/home/utils/dayMealSummary";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { getMealRecordPath, getMealSearchPath, getWorkoutRecordPath } from "@/router/pathHelpers";
import type { MealType } from "@/shared/api/types/api.dto";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { formatNumberWithMaxOneDecimal } from "@/shared/utils/numberFormat";

const MEAL_TYPES = [
  { type: "0", label: "아침", icon: "breakfast" },
  { type: "1", label: "점심", icon: "lunch" },
  { type: "2", label: "저녁", icon: "dinner" },
  { type: "3", label: "간식", icon: "snack" },
  { type: "4", label: "야식", icon: "late-snack" },
] as const;

export default function RecordActionSection({ selectedDate }: { selectedDate: string }) {
  const navigate = useNavigate();
  const { data: profile } = useGetProfileQuery();
  const { data: dayMeals, isPending: isDayMealsPending } = useDayMealsQuery(selectedDate);
  const canAccessWorkoutRecord = profile?.role === "ADMIN";

  const handleMoveMealRecord = (mealType: MealType, hasMenus: boolean) => {
    navigate(
      hasMenus
        ? getMealRecordPath(selectedDate, mealType)
        : getMealSearchPath(selectedDate, mealType),
    );
  };

  return (
    <div className={styles.root}>
      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">식단 기록</h2>

        {isDayMealsPending ? (
          <p role="status">식단 기록을 불러오는 중이에요</p>
        ) : (
          <ul className={styles.mealsArea}>
            {MEAL_TYPES.map(({ type, label, icon }) => {
              const menus = dayMeals?.menusByTime[type] ?? [];
              const hasMenus = menus.length > 0;
              const calories = dayMeals?.caloriesByTime[type] ?? 0;

              return (
                <li key={type} className={styles.mealItem}>
                  <button
                    type="button"
                    className={styles.mealButton}
                    onClick={() => handleMoveMealRecord(type, hasMenus)}
                  >
                    <div className={styles.mealTitleArea}>
                      <div className={styles.mealIcon} data-selected={hasMenus}>
                        <SystemIcon size={18} name={icon} />
                      </div>

                      <p className="body-l-medium text-primary">{label}</p>

                      <SystemIcon
                        name="plus-circle"
                        size={24}
                        className="marginLeft text-secondary"
                      />
                    </div>
                    {hasMenus && (
                      <div className={styles.mealInfo}>
                        <MealSummaryText menus={menus} />
                        <p className="body-s-regular text-disabled">
                          {formatNumberWithMaxOneDecimal(calories)}kcal
                        </p>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canAccessWorkoutRecord ? (
        <section className={styles.recordGroup}>
          <h2 className="title-s-semi text-primary">운동 기록</h2>
          <Tile onClick={() => navigate(getWorkoutRecordPath(selectedDate))}>
            <p>00분 00kcal 소모</p>
          </Tile>
        </section>
      ) : null}

      <section className={styles.recordGroup}>
        <h2 className="title-s-semi text-primary">건강 기록</h2>
        <TodayBodyLogSection date={selectedDate} />
      </section>
    </div>
  );
}

function MealSummaryText({ menus }: { menus: MenuWithQuantity[] }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [summaryText, setSummaryText] = useState(() => getMealSummaryText(menus, 1));

  useLayoutEffect(() => {
    const textElement = textRef.current;
    const measureElement = measureRef.current;

    if (!textElement || !measureElement) return;

    const updateSummaryText = () => {
      const availableWidth = textElement.clientWidth;

      if (availableWidth === 0) return;

      for (let visibleCount = menus.length; visibleCount >= 1; visibleCount -= 1) {
        const candidate = getMealSummaryText(menus, visibleCount);
        measureElement.textContent = candidate;

        if (measureElement.getBoundingClientRect().width <= availableWidth) {
          setSummaryText(candidate);
          return;
        }
      }

      setSummaryText(`총 ${menus.length}개 메뉴`);
    };

    updateSummaryText();

    const resizeObserver = new ResizeObserver(updateSummaryText);
    resizeObserver.observe(textElement);

    return () => resizeObserver.disconnect();
  }, [menus]);

  return (
    <p ref={textRef} className={`${styles.mealSummary} body-s-regular text-secondary`}>
      <span ref={measureRef} aria-hidden className={styles.mealSummaryMeasure} />
      {summaryText}
    </p>
  );
}

function getMealSummaryText(menus: MenuWithQuantity[], visibleCount: number) {
  if (menus.length === 0) return "기록된 식사가 없어요";

  const visibleNames = menus
    .slice(0, visibleCount)
    .map(({ name }) => name)
    .join(", ");
  const hiddenCount = menus.length - visibleCount;

  return hiddenCount > 0 ? `${visibleNames} 외 ${hiddenCount}개` : visibleNames;
}
