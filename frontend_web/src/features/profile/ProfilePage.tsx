import { ChevronRightIcon, Pencil, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
import { toast } from "@/shared/commons/toast/toast";
import { toggleFreeUserGuardEnabled } from "@/shared/guards/featureGuard";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

const METRIC_CONFIG: Record<
  WeeklyMetricType,
  {
    targetLabel?: string;
    ticks: number[];
    title: string;
    unit: string;
  }
> = {
  weight: {
    title: "체중",
    unit: "kg",
    ticks: [0, 25, 50, 75, 100],
    targetLabel: "목표 체중",
  },
  calories: {
    title: "섭취량",
    unit: "kcal",
    ticks: [0, 1000, 2000, 3000, 4000],
    targetLabel: "목표 섭취량",
  },
  steps: {
    title: "걸음 수",
    unit: "걸음",
    ticks: [0, 3000, 6000, 9000, 12000],
  },
};

const NICKNAME_MAX_LENGTH = 15;
const NICKNAME_ALLOWED_PATTERN = /[^0-9A-Za-zㄱ-ㅎㅏ-ㅣ가-힣]/g;
const GUARD_TOGGLE_REQUIRED_TAP_COUNT = 5;
const GUARD_TOGGLE_TAP_INTERVAL_MS = 1200;

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
  const [selectedMetric, setSelectedMetric] = useState<WeeklyMetricType>("weight");
  const nicknameTapStateRef = useRef({ count: 0, lastTappedAt: 0 });
  const { mutate: updateNickName } = useNickNameUpdateMutation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep sheet input synced with async profile data.
    setNickName(sanitizeNickName(profile?.nickname ?? ""));
  }, [profile?.nickname]);

  const nickname = profile?.nickname ?? "진득한 푸마";
  const currentWeight = profile?.weight ?? 0;
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
      toast.warning("닉네임을 입력해주세요");
      return;
    }

    updateNickName(nickName, {
      onSuccess: () => {
        setSheetOpen(false);
        toast.success("닉네임이 수정되었어요");
      },
      onError: () => {
        toast.warning("닉네임 수정에 실패했어요");
      },
    });
  };

  const handleNicknameGuardToggleTap = () => {
    const now = Date.now();
    const previousTapState = nicknameTapStateRef.current;
    const isContinuousTap = now - previousTapState.lastTappedAt <= GUARD_TOGGLE_TAP_INTERVAL_MS;
    const nextCount = isContinuousTap ? previousTapState.count + 1 : 1;

    nicknameTapStateRef.current = {
      count: nextCount,
      lastTappedAt: now,
    };

    if (nextCount < GUARD_TOGGLE_REQUIRED_TAP_COUNT) return;

    nicknameTapStateRef.current = { count: 0, lastTappedAt: 0 };
    toggleFreeUserGuardEnabled();
  };

  if (isProfilePending || isDayMealPending || isBodyLogPending) {
    return <div>로딩 중..</div>;
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
            <Settings size={24} />
          </button>
        }
      />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.summarySection}>
            <div className={styles.summaryText}>
              <div className={styles.nicknameRow}>
                <button
                  type="button"
                  className={styles.nicknameButton}
                  onClick={handleNicknameGuardToggleTap}
                >
                  <span className={`${styles.nickname} typo-title2`}>
                    <span className={styles.highlight}>{nickname}</span> 님
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.inlineIconButton}
                  aria-label="닉네임 수정"
                  onClick={() => {
                    setSheetOpen(true);
                  }}
                >
                  <Pencil size={20} />
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
                onClick={() => navigate(PATH.GOAL_EDIT, { state: { goalEditFlow: true } })}
                variant="text"
                size="small"
                color="normal"
              >
                목표 재설정
                <ChevronRightIcon size={20} className={styles.icon} />
              </Button>
            </div>
          </section>

          <section className={styles.activeCardGrid}>
            <ActionCard
              onClick={() => handleSelectMetric("weight")}
              className={`${styles.activeCard} ${selectedMetric === "weight" ? styles.activeMetricCard : ""}`}
            >
              <p className={`${styles.activeCardTitle} typo-title4`}>체중</p>

              <div className={styles.activeCardValueRow}>
                <span className={`${styles.activeCardValue} typo-title4`}>
                  {currentWeight.toLocaleString("ko-KR")}
                </span>
                <span className={`${styles.activeCardUnit} typo-label4`}>kg</span>
              </div>
            </ActionCard>

            <ActionCard
              onClick={() => handleSelectMetric("calories")}
              className={`${styles.activeCard} ${selectedMetric === "calories" ? styles.activeMetricCard : ""}`}
            >
              <p className={`${styles.activeCardTitle} typo-title4`}>섭취량</p>

              <div className={styles.activeCardValueRow}>
                <span className={`${styles.activeCardValue} typo-title4`}>
                  {(dayMeal?.totalCalories ?? 0).toLocaleString("ko-KR")}
                </span>
                <span className={`${styles.activeCardUnit} typo-label4`}>kcal</span>
              </div>
            </ActionCard>

            <ActionCard
              onClick={() => handleSelectMetric("steps")}
              className={`${styles.activeCard} ${selectedMetric === "steps" ? styles.activeMetricCard : ""}`}
            >
              <p className={`${styles.activeCardTitle} typo-title4`}>걸음 수</p>

              <div className={styles.activeCardValueRow}>
                <span className={`${styles.activeCardValue} typo-title4`}>
                  {todaySteps === null ? "-" : todaySteps.toLocaleString("ko-KR")}
                </span>
                <span className={`${styles.activeCardUnit} typo-label4`}>보</span>
              </div>
            </ActionCard>
          </section>

          <div className="divider" />

          <section className={styles.weeklySection}>
            <div className={styles.weeklyHeader}>
              <span className={`${styles.weeklyTitle} typo-title3`}>주간 기록 현황</span>

              <div className={styles.legendRow}>
                {metricConfig.targetLabel && (
                  <span className={`${styles.legendItem} typo-label4`}>
                    <span className={`${styles.legendDot} ${styles.legendTarget}`} />
                    {metricConfig.targetLabel}
                  </span>
                )}
                <span className={`${styles.legendItem} typo-label4`}>
                  <span className={`${styles.legendDot} ${styles.legendCurrent}`} />
                  {metricConfig.title}
                </span>
              </div>
            </div>

            {weeklyRecordQuery.isPending ? (
              <p className={`${styles.weeklyStatusText} typo-label2`}>
                주간 기록을 불러오는 중이에요.
              </p>
            ) : weeklyRecordQuery.hasError ? (
              <p className={`${styles.weeklyStatusText} typo-label2`}>
                주간 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.
              </p>
            ) : (
              <section className={styles.weeklyChart}>
                <span className={`${styles.weeklyYLabel} typo-caption`}>{metricConfig.title}</span>
                <WeeklyRecordChart
                  data={weeklyChartData}
                  unit={metricConfig.unit}
                  yTicks={metricConfig.ticks}
                />
              </section>
            )}
          </section>

          <BottomSheet
            isOpen={sheetOpen}
            onClose={() => {
              setSheetOpen(false);
              setNickName(sanitizeNickName(profile?.nickname ?? ""));
            }}
          >
            <div className={styles.sheetContainer}>
              <section className={styles.sheetContent}>
                <p className="typo-title2">닉네임 수정하기</p>
                <input
                  placeholder="닉네임 입력"
                  value={nickName}
                  onChange={(e) => setNickName(sanitizeNickName(e.target.value))}
                  className={`${styles.input} typo-body3`}
                />
              </section>

              <Button
                variant="filled"
                interaction={nickName.trim() === "" ? "disable" : "normal"}
                size="large"
                color="primary"
                fullWidth
                onClick={handleUpdateNickName}
                disabled={nickName.trim() === ""}
              >
                수정하기
              </Button>
            </div>
          </BottomSheet>
        </div>
      </main>
    </div>
  );
}
