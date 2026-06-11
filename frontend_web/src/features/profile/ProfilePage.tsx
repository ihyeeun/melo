import { useEffect, useMemo, useRef, useState } from "react";

import ActionCard from "@/features/home/components/cards/ActionCard";
import { useGetBodyLog } from "@/features/home/hooks/queries/useBodyLogQuery";
import { useDayMealsQuery } from "@/features/home/hooks/queries/useDayMealsQuery";
import WeeklyRecordChart from "@/features/profile/components/WeeklyRecordChart";
import { useNickNameUpdateMutation } from "@/features/profile/hooks/mutations/useProfileMutation";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import {
  useWeeklyRecordQuery,
  type WeeklyMetricType,
} from "@/features/profile/hooks/queries/useWeeklyRecordQuery";
import styles from "@/features/profile/styles/ProfilePage.module.css";
import { PATH } from "@/router/path";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
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

const NICKNAME_MAX_LENGTH = 15;
const NICKNAME_ALLOWED_PATTERN = /[^0-9A-Za-zㄱ-ㅎㅏ-ㅣ가-힣]/g;

const sanitizeNickName = (value: string) =>
  value.replace(NICKNAME_ALLOWED_PATTERN, "").slice(0, NICKNAME_MAX_LENGTH);

export default function ProfilePage() {
  const navigate = useNavigate();
  const today = getTodayFormatDateKey();
  const { data: profile, isPending: isProfilePending } = useGetProfileQuery();
  const { data: dayMeal, isPending: isDayMealPending } = useDayMealsQuery(today);
  const { data: bodyLog, isPending: isBodyLogPending } = useGetBodyLog(today);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [nickName, setNickName] = useState("");
  const [nickNameErrorMessage, setNickNameErrorMessage] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<WeeklyMetricType>("weight");
  const { mutate: updateNickName, isPending: isNickNamePending } = useNickNameUpdateMutation();
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep sheet input synced with async profile data.
    setNickName(sanitizeNickName(profile?.nickname ?? ""));
  }, [profile?.nickname]);

  const nickname = profile?.nickname ?? "진득한 푸마";
  const todayWeight =
    typeof bodyLog?.weight === "number" && Number.isFinite(bodyLog.weight) && bodyLog.weight > 0
      ? bodyLog.weight
      : undefined;
  const currentWeight = todayWeight ?? profile?.weight ?? 0;
  const targetWeight = profile?.target_weight ?? currentWeight;
  const targetCalories = profile?.target_calories ?? 2000;
  const remainingWeight = Math.abs(currentWeight - targetWeight);
  const todaySteps =
    typeof bodyLog?.steps === "number" && bodyLog.steps >= 0 ? bodyLog.steps : null;
  const metricConfig = METRIC_CONFIG[selectedMetric];

  const weeklyRecordQuery = useWeeklyRecordQuery({
    metric: selectedMetric,
    today,
    targetWeight,
    targetCalories,
  });

  const weeklyChartData = useMemo(() => {
    return weeklyRecordQuery.records.map((record) => {
      if (selectedMetric === "weight") {
        return {
          label: record.label,
          value: record.weight,
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
        value: record.steps ?? 0,
      };
    });
  }, [selectedMetric, weeklyRecordQuery.records]);

  const handleSelectMetric = (metric: WeeklyMetricType) => {
    setSelectedMetric(metric);
  };

  const handleUpdateNickName = () => {
    if (nickName?.trim() === "" || nickName === undefined) {
      setNickNameErrorMessage("");
      toast.warning("닉네임을 입력해주세요");
      return;
    }

    setNickNameErrorMessage("");
    updateNickName(nickName, {
      onSuccess: () => {
        setSheetOpen(false);
        setNickNameErrorMessage("");
        toast.success("닉네임이 수정되었어요");
      },
      onError: (error) => {
        if (error.statusCode === 409) {
          setNickNameErrorMessage("이미 사용 중인 닉네임이에요");
        } else {
          setNickNameErrorMessage("닉네임 수정에 실패했어요");
        }
      },
    });
  };

  if (isProfilePending || isDayMealPending || isBodyLogPending) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        rightSlot={
          <button
            type="button"
            className={styles.headerIconButton}
            onClick={() => navigate(PATH.SETTINGS)}
            aria-label="설정"
          >
            <SystemIcon name="setting" size={24} />
          </button>
        }
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.summarySection}>
            <div className={styles.summaryText}>
              <div className={styles.nicknameRow}>
                {profile?.is_subscribed && (
                  <img src="/icons/subscribe-badge.svg" className={styles.subscribeBadge} />
                )}
                <p className={`${styles.nickname} typo-title1`}>
                  <span className={styles.highlight}>{nickname}</span> 님
                </p>

                <button
                  type="button"
                  className={styles.inlineIconButton}
                  aria-label="닉네임 수정"
                  onClick={() => {
                    setSheetOpen(true);
                  }}
                >
                  <SystemIcon name="pencil-fill" size={24} />
                </button>
              </div>

              <p className={`${styles.goalText} typo-body1`}>
                목표 체중까지{" "}
                <span className={styles.highlight}>
                  {remainingWeight.toLocaleString("ko-KR")}kg
                </span>{" "}
                남았어요
              </p>
            </div>

            <div className={styles.textButton}>
              <Button
                onClick={() => navigate(PATH.GOAL_EDIT)}
                variant="text"
                size="small"
                color="normal"
              >
                목표 재설정
                <SystemIcon name="chevron-right-thin" size={20} className={styles.icon} />
              </Button>
            </div>
          </section>

          <div>
            <section className={styles.activeCardGrid}>
              <ActionCard
                onClick={() => handleSelectMetric("weight")}
                className={`${styles.activeCard} ${selectedMetric === "weight" ? styles.activeMetricCard : ""}`}
              >
                <p className={`${styles.activeCardTitle} typo-title4`}>체중</p>

                <div className={styles.activeCardValueRow}>
                  <span className={`${styles.activeCardValue} typo-body3`}>
                    {currentWeight.toLocaleString("ko-KR")}
                  </span>
                  <span className={`${styles.activeCardUnit} typo-caption3`}>kg</span>
                </div>
              </ActionCard>

              <ActionCard
                onClick={() => handleSelectMetric("calories")}
                className={`${styles.activeCard} ${selectedMetric === "calories" ? styles.activeMetricCard : ""}`}
              >
                <p className={`${styles.activeCardTitle} typo-title4`}>섭취량</p>

                <div className={styles.activeCardValueRow}>
                  <span className={`${styles.activeCardValue} typo-body3`}>
                    {(dayMeal?.totalCalories ?? 0).toLocaleString("ko-KR", {
                      maximumFractionDigits: 1,
                    })}
                  </span>
                  <span className={`${styles.activeCardUnit} textNoWrap typo-caption3`}>kcal</span>
                </div>
              </ActionCard>

              <ActionCard
                onClick={() => handleSelectMetric("steps")}
                className={`${styles.activeCard} ${selectedMetric === "steps" ? styles.activeMetricCard : ""}`}
              >
                <p className={`${styles.activeCardTitle} typo-title4`}>걸음 수</p>

                <div className={styles.activeCardValueRow}>
                  <span className={`${styles.activeCardValue} typo-body3`}>
                    {todaySteps === null ? "0" : todaySteps.toLocaleString("ko-KR")}
                  </span>
                  <span className={`${styles.activeCardUnit} typo-caption3`}>보</span>
                </div>
              </ActionCard>
            </section>

            <section className={styles.weeklySection}>
              <div className={styles.weeklyHeader}>
                <span className={`${styles.weeklyTitle} typo-title4`}>주간 기록 현황</span>

                <div className={styles.legendRow}>
                  {metricConfig.targetLabel && (
                    <span className={`${styles.legendItem} typo-caption3`}>
                      <span className={`${styles.legendDot} ${styles.legendTarget}`} />
                      {metricConfig.targetLabel}
                    </span>
                  )}
                  <span className={`${styles.legendItem} typo-caption3`}>
                    <span className={`${styles.legendDot} ${styles.legendCurrent}`} />
                    {metricConfig.title}
                  </span>
                </div>
              </div>

              {weeklyRecordQuery.isPending ? (
                <WeeklyRecordSkeleton />
              ) : weeklyRecordQuery.hasError ? (
                <p className={`${styles.weeklyStatusText} typo-label2`}>
                  주간 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.
                </p>
              ) : (
                <section className={styles.weeklyChart}>
                  <span className={`${styles.weeklyYLabel} typo-caption4`}>
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
          </div>

          <BottomSheet
            isOpen={sheetOpen}
            onOpenEnd={focusInput}
            onClose={() => {
              setSheetOpen(false);
              setNickName(sanitizeNickName(profile?.nickname ?? ""));
              setNickNameErrorMessage("");
            }}
          >
            <div className={styles.sheetContainer}>
              <section className={styles.sheetContent}>
                <p className="typo-title2">닉네임 수정하기</p>
                <div className={styles.fieldGroup}>
                  <input
                    placeholder="닉네임 입력"
                    value={nickName}
                    onChange={(e) => {
                      setNickName(sanitizeNickName(e.target.value));
                      setNickNameErrorMessage("");
                    }}
                    className={`${styles.input} typo-body3`}
                    aria-invalid={nickNameErrorMessage ? true : undefined}
                    aria-describedby={
                      nickNameErrorMessage ? "profile-nickname-error-message" : undefined
                    }
                    ref={inputRef}
                  />
                  {nickNameErrorMessage ? (
                    <p
                      id="profile-nickname-error-message"
                      className={`${styles.nickNameErrorMessage} typo-body3`}
                      role="alert"
                    >
                      {nickNameErrorMessage}
                    </p>
                  ) : null}
                </div>
              </section>

              <Button
                variant="filled"
                interaction={nickName.trim() === "" ? "disable" : "normal"}
                size="large"
                color="primary"
                fullWidth
                onClick={handleUpdateNickName}
                disabled={nickName.trim() === "" || isNickNamePending}
              >
                수정하기
              </Button>
            </div>
          </BottomSheet>
        </div>
      </main>

      {isNickNamePending ? <LoadingOverlay label="닉네임을 수정하는 중입니다." /> : null}
    </div>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className={styles.page}>
      <PageHeader
        rightSlot={
          <Skeleton className={styles.headerIconButton} width={24} height={24} variant="circle" />
        }
      />

      <main className={styles.main}>
        <SkeletonStatus className={styles.content} label="프로필 정보를 불러오는 중입니다.">
          <section className={styles.summarySection}>
            <div className={styles.summaryText}>
              <div className={styles.nicknameRow}>
                <Skeleton width="48%" height={28} radius={999} />
                <Skeleton width={24} height={24} variant="circle" />
              </div>
              <Skeleton width="72%" height={24} radius={999} />
            </div>
            <Skeleton width={96} height={32} radius={999} />
          </section>

          <div>
            <section className={styles.activeCardGrid}>
              {Array.from({ length: 3 }).map((_, index) => (
                <ActionCard key={index} className={styles.activeCard}>
                  <Skeleton width="52%" height={18} radius={999} />
                  <div className={styles.activeCardValueRow}>
                    <Skeleton width="70%" height={22} radius={999} />
                  </div>
                </ActionCard>
              ))}
            </section>

            <section className={styles.weeklySection}>
              <div className={styles.weeklyHeader}>
                <Skeleton width={112} height={22} radius={999} />
                <Skeleton width={126} height={18} radius={999} />
              </div>
              <WeeklyRecordSkeleton />
            </section>
          </div>
        </SkeletonStatus>
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
