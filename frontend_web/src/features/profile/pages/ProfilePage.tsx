import { useMemo, useState } from "react";

import {
  useNativeStepCountQuery,
  useNativeStepCountRecordsQuery,
} from "@/features/health/hooks/useNativeStepCountQuery";
import { useDayMealsQuery, useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import WeeklyRecordChart from "@/features/profile/components/WeeklyRecordChart";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import {
  useWeeklyRecordQuery,
  type WeeklyMetricType,
} from "@/features/profile/hooks/queries/useWeeklyRecordQuery";
import styles from "@/features/profile/styles/ProfilePage.module.css";
import { PATH } from "@/router/path";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

const METRIC_CONFIG: Record<
  WeeklyMetricType,
  {
    domainMode?: "fit" | "zero";
    targetLabel?: string;
    ticks?: number[];
    title: string;
    unit: string;
  }
> = {
  weight: {
    title: "체중",
    unit: "kg",
    domainMode: "fit",
    targetLabel: "목표 체중",
  },
  calories: {
    title: "섭취량",
    unit: "kcal",
    domainMode: "fit",
    targetLabel: "목표 섭취량",
  },
  steps: {
    title: "걸음 수",
    unit: "보",
    ticks: [0, 3000, 6000, 9000, 12000],
  },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const today = getTodayFormatDateKey();
  const { data: profile, isPending: isProfilePending } = useGetProfileQuery();
  const { data: dayMeal, isPending: isDayMealPending } = useDayMealsQuery(today);
  const { data: bodyLog, isPending: isBodyLogPending } = useGetBodyLog(today);

  const [selectedMetric, setSelectedMetric] = useState<WeeklyMetricType>("weight");

  const nickname = profile?.nickname ?? "진득한 푸마";
  const todayWeight =
    typeof bodyLog?.weight === "number" && Number.isFinite(bodyLog.weight) && bodyLog.weight > 0
      ? bodyLog.weight
      : undefined;
  const currentWeight = todayWeight ?? profile?.weight ?? 0;
  const targetWeight = profile?.target_weight ?? currentWeight;
  const targetCalories = profile?.target_calories ?? 2000;
  const remainingWeight = Math.abs(currentWeight - targetWeight);
  const savedTodaySteps =
    typeof bodyLog?.steps === "number" && bodyLog.steps >= 0 ? bodyLog.steps : null;
  const metricConfig = METRIC_CONFIG[selectedMetric];

  const weeklyRecordQuery = useWeeklyRecordQuery({
    metric: selectedMetric,
    today,
    targetWeight,
    targetCalories,
  });
  const weeklyStartDate = weeklyRecordQuery.records[0]?.dateKey ?? today;
  const weeklyEndDate = weeklyRecordQuery.records.at(-1)?.dateKey ?? today;
  const { data: nativeTodayStepCount } = useNativeStepCountQuery(today);
  const { data: nativeWeeklyStepCount } = useNativeStepCountRecordsQuery(
    {
      startDate: weeklyStartDate,
      endDate: weeklyEndDate,
    },
    { enabled: selectedMetric === "steps" },
  );
  const todaySteps = nativeTodayStepCount?.steps ?? savedTodaySteps ?? 0;
  const nativeWeeklyStepsByDate = useMemo(() => {
    return new Map(
      (nativeWeeklyStepCount?.records ?? []).map((record) => [record.date, record.steps]),
    );
  }, [nativeWeeklyStepCount?.records]);

  const weeklyChartData = useMemo(() => {
    return weeklyRecordQuery.records.map((record) => {
      if (selectedMetric === "weight") {
        return {
          label: record.label,
          value: record.weight ?? currentWeight,
          target: record.targetWeight,
        };
      }

      if (selectedMetric === "calories") {
        return {
          label: record.label,
          value: record.calories,
          target: record.targetCalories,
        };
      }

      return {
        label: record.label,
        value: record.steps ?? nativeWeeklyStepsByDate.get(record.dateKey) ?? 0,
      };
    });
  }, [currentWeight, nativeWeeklyStepsByDate, selectedMetric, weeklyRecordQuery.records]);

  const handleSelectMetric = (metric: WeeklyMetricType) => {
    setSelectedMetric(metric);
  };

  if (isProfilePending || isDayMealPending || isBodyLogPending) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className={`${styles.page} page`}>
      <PageHeader
        rightSlot={
          <button
            type="button"
            className={styles.headerIconButton}
            onClick={() => navigate(PATH.SETTINGS)}
            aria-label="설정"
          >
            <SystemIcon name="more-horiz" size={24} className="text-secondary" />
          </button>
        }
      />

      <main className={`main ${styles.content}`}>
        <section>
          <div className={styles.nicknameRow}>
            {/* {profile?.is_subscribed && (
                  <span className={`${styles.subscribeBadge} caption-m-semi`}>구독</span>
                )} */}
            <p className={`title-l-semi text-primary`}>
              <span className={styles.highlightText}>{nickname}</span> 님
            </p>

            <button
              type="button"
              className={styles.inlineIconButton}
              aria-label="닉네임 수정"
              onClick={() => {
                navigate(PATH.PROFILE_NICKNAME_SHEET);
              }}
            >
              <SystemIcon name="edit" size={24} className="text-secondary" />
            </button>
          </div>

          <p className={`${styles.goalText} title-m-semi text-primary`}>
            목표 체중까지{" "}
            <span className={styles.highlightText}>
              {remainingWeight.toLocaleString("ko-KR")}kg
            </span>{" "}
            남았어요
          </p>

          <button
            type="button"
            className={styles.goalEditButton}
            onClick={() => navigate(PATH.GOAL_EDIT)}
          >
            <span className="body-s-medium text-secondary">목표 재설정</span>
            <SystemIcon name="chevron-right" size={12} />
          </button>
        </section>

        <section className={styles.healthStatGroup}>
          <SelectedCard
            setSelectedChange={() => handleSelectMetric("weight")}
            isSelected={selectedMetric === "weight"}
            className={`${styles.activeCard}`}
          >
            <p className={`body-l-semi text-primary`}>체중</p>

            <p className={`body-s-medium amp-mask marginLeft`}>
              <span className={styles.highlightText}>{currentWeight.toLocaleString("ko-KR")}</span>
              <span className={`${styles.amountUnit} body-s-regular`}>kg</span>
            </p>
          </SelectedCard>

          <SelectedCard
            setSelectedChange={() => handleSelectMetric("calories")}
            isSelected={selectedMetric === "calories"}
            className={`${styles.activeCard}`}
          >
            <p className={`body-l-semi text-primary`}>섭취량</p>

            <p className={`body-s-medium amp-mask marginLeft`}>
              <span className={styles.highlightText}>
                {(dayMeal?.totalCalories ?? 0).toLocaleString("ko-KR", {
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className={`${styles.amountUnit} body-s-regular`}>kcal</span>
            </p>
          </SelectedCard>

          <SelectedCard
            setSelectedChange={() => handleSelectMetric("steps")}
            isSelected={selectedMetric === "steps"}
            className={`${styles.activeCard}`}
          >
            <p className={`body-l-semi text-primary`}>걸음 수</p>
            <p className={`body-s-medium amp-mask marginLeft`}>
              <span className={styles.highlightText}>{todaySteps.toLocaleString("ko-KR")}</span>
              <span className={`${styles.amountUnit} body-s-regular`}>보</span>
            </p>
          </SelectedCard>
        </section>

        <section className={styles.weeklySection}>
          <div className={styles.weeklyHeader}>
            <span className={`${styles.weeklyTitle} body-l-semi`}>주간 기록 현황</span>

            <div className={styles.legendRow}>
              {metricConfig.targetLabel && (
                <span className={`${styles.legendItem} body-m-regular`}>
                  <span className={`${styles.legendDot} ${styles.legendTarget}`} />
                  {metricConfig.targetLabel}
                </span>
              )}
              <span className={`${styles.legendItem} body-m-regular`}>
                <span className={`${styles.legendDot} ${styles.legendCurrent}`} />
                {metricConfig.title}
              </span>
            </div>
          </div>

          {weeklyRecordQuery.isPending ? (
            <WeeklyRecordSkeleton />
          ) : weeklyRecordQuery.hasError ? (
            <p className={`${styles.weeklyStatusText} body-l-semi`}>
              주간 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.
            </p>
          ) : (
            <section className={styles.weeklyChart}>
              <span className={`${styles.weeklyYLabel} caption-m-medium`}>
                {metricConfig.title}
              </span>
              <WeeklyRecordChart
                data={weeklyChartData}
                domainMode={metricConfig.domainMode}
                targetLabel={metricConfig.targetLabel}
                unit={metricConfig.unit}
                valueLabel={metricConfig.title}
                yTicks={metricConfig.ticks}
              />
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className={`${styles.page} page`}>
      <PageHeader />

      <main className={`${styles.content} main`}>
        <section>
          <Skeleton width={112} height={92} />
        </section>

        <section className={styles.healthStatGroup}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SelectedCard isSelected={false} key={index} className={styles.activeCard}>
              <Skeleton width="52%" height={18} radius={999} />
              <div className={styles.activeCardValueRow}>
                <Skeleton width="70%" height={22} radius={999} />
              </div>
            </SelectedCard>
          ))}
        </section>

        <section className={styles.weeklySection}>
          <div className={styles.weeklyHeader}>
            <Skeleton width={112} height={22} />
          </div>
          <WeeklyRecordSkeleton />
        </section>
      </main>
    </div>
  );
}

function WeeklyRecordSkeleton() {
  return (
    <section className={styles.weeklyChart}>
      <Skeleton className={styles.weeklyYLabelSkeleton} width={42} height={12} radius={999} />
      <div className={styles.weeklyChartSkeleton} aria-hidden="true">
        <div className={styles.weeklyChartSkeletonPlot}>
          <div className={styles.weeklyChartSkeletonYAxis}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} width={10} height={10} radius={999} />
            ))}
          </div>

          <div className={styles.weeklyChartSkeletonCanvas}>
            <div className={styles.weeklyChartSkeletonGrid}>
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} className={styles.weeklyChartSkeletonGridLine} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.weeklyChartSkeletonXAxis}>
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className={styles.weeklyChartSkeletonXAxisTick}
              width={20}
              height={10}
              radius={999}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
