import { useQueryClient } from "@tanstack/react-query";
import { isToday } from "date-fns";

import { usePersonalizedManagementMutation } from "@/features/chat/hooks/mutations/usePersonalizedManagementMutation";
import { HOME_MENSTRUAL_STATUS_VIEW } from "@/features/menstruation/constants/menstruation.constant";
import type { MenstrualPhaseResult } from "@/features/menstruation/hooks/useMenstrualPhase";
import styles from "@/features/menstruation/styles/MenstruationCardButton.module.css";
import { getMenstrualPhaseDayInfo } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { toast } from "@/shared/commons/toast/toast";
import { FEATURE_GUARD, useIsFeatureBlocked } from "@/shared/guards/featureGuard";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";
import { parseDate } from "@/shared/utils/dateFormat";

export default function MenstruationCardButton({ phase }: { phase: MenstrualPhaseResult }) {
  const selectedDateKey = useSelectedDateKey();
  const selectedDay = parseDate(selectedDateKey);
  const isSelectedDateToday = selectedDay !== null ? isToday(selectedDay) : false;
  const { menstrualStatus, isIrregularBleeding, isLoading, isError, retry, phaseDate } = phase;
  const isFreeBlocked = useIsFeatureBlocked(FEATURE_GUARD.CHAT);
  const showChatButton = isSelectedDateToday && !isFreeBlocked;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: requestPersonalizedManagement, isPending } =
    usePersonalizedManagementMutation({
      onError: (error) => {
        toast.warning(error.message || "맞춤 관리법을 불러오지 못했어요. 다시 시도해주세요.");
      },
    });
  const homeContent = menstrualStatus
    ? HOME_MENSTRUAL_STATUS_VIEW[menstrualStatus]
    : HOME_MENSTRUAL_STATUS_VIEW["undefined"];

  const isEmpty = menstrualStatus === undefined;
  const title = isLoading
    ? "생리 기록을 불러오고 있어요"
    : isError
      ? "기록을 불러오지 못했어요"
      : isIrregularBleeding
        ? "부정출혈"
        : homeContent.title(getMenstrualPhaseDayInfo(selectedDateKey, phaseDate));
  const message = isLoading
    ? "잠시만 기다려 주세요."
    : isError
      ? "눌러서 다시 시도해 주세요."
      : homeContent.message;

  const timeline = [
    ...new Set(
      Object.values(HOME_MENSTRUAL_STATUS_VIEW)
        .filter(({ phaseIndex }) => (isEmpty ? phaseIndex < 4 : phaseIndex >= 0))
        .sort((a, b) => a.phaseIndex - b.phaseIndex)
        .map(({ phaseLabel }) => phaseLabel),
    ),
  ];

  const activePhaseIndex = timeline.indexOf(homeContent.phaseLabel);

  const progressPercent = ((activePhaseIndex + 0.5) / timeline.length) * 100;

  return (
    <div className={styles.root} data-isChatButtonBlock={showChatButton}>
      <button
        type="button"
        className={styles.recordButton}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={`${title}. ${message} ${isLoading ? "" : isError ? "다시 시도" : "생리 기록 보기"}`}
        onClick={() => {
          if (isError) {
            retry();
            return;
          }
          return navigate(PATH.MENSTRUATION_RECORD);
        }}
      >
        <img
          src={homeContent.source}
          width={345}
          height={200}
          className={styles.img}
          alt=""
          aria-hidden="true"
        />

        <div className={styles.actionIcon}>
          <SystemIcon name="arrow-insert" size={24} />
        </div>

        <span className={`${styles.title} title-s-semi text-primary`}>{title}</span>
        <span className={styles.messageBubble}>{message}</span>

        {!isLoading && !isError && (
          <span className={styles.stepper} aria-hidden="true">
            <span className={styles.track}>
              <span className={styles.progress} style={{ width: `${progressPercent}%` }} />
            </span>

            <span className={styles.phaseList}>
              {timeline.map((timelineStep, index) => {
                const phaseState =
                  index < activePhaseIndex
                    ? styles.completed
                    : index === activePhaseIndex
                      ? styles.current
                      : "";

                return (
                  <span
                    className={`${styles.phaseItem} ${phaseState}`}
                    key={`${timelineStep}-${index}`}
                  >
                    <span className={styles.dotArea}>
                      <span className={styles.dot} />
                    </span>
                    <span className={`${styles.phaseLabel} body-xs-regular`}>{timelineStep}</span>
                  </span>
                );
              })}
            </span>
          </span>
        )}
      </button>
      {showChatButton && (
        <button
          type="button"
          className={`${styles.chatActionButton} body-s-medium text-primary textCenter`}
          disabled={isLoading || isPending}
          aria-busy={isPending}
          onClick={() => {
            if (queryClient.isMutating({ mutationKey: ["personalized-management"] }) > 0) return;

            requestPersonalizedManagement();
            navigate(PATH.CHAT);
            track(EVENT_NAME.CLICK_MY_MANAGEMENT_AI_COACH);
          }}
        >
          지금 나에게 맞는 관리법 알아보기
        </button>
      )}
    </div>
  );
}
