import { HOME_MENSTRUAL_STATUS_VIEW } from "@/features/menstruation/constants/menstruation.constant";
import type { MenstrualPhaseResult } from "@/features/menstruation/hooks/useMenstrualPhase";
import styles from "@/features/menstruation/styles/MenstruationCardButton.module.css";
import { getMenstrualPhaseDayInfo } from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

export default function MenstruationCardButton({ phase }: { phase: MenstrualPhaseResult }) {
  const selectedDateKey = useSelectedDateKey();
  const { menstrualStatus, hasRecords, isLoading, isError, retry, phaseDate } = phase;
  const navigate = useNavigate();
  const homeContent = menstrualStatus
    ? HOME_MENSTRUAL_STATUS_VIEW[menstrualStatus]
    : HOME_MENSTRUAL_STATUS_VIEW["undefined"];

  const isEmpty = menstrualStatus === undefined;
  const isUnknownPhase = !isLoading && !isError && hasRecords && isEmpty;
  const title = isLoading
    ? "생리 기록을 불러오고 있어요"
    : isError
      ? "기록을 불러오지 못했어요"
      : isUnknownPhase
        ? "주기 정보가 없어요"
        : homeContent.title(getMenstrualPhaseDayInfo(selectedDateKey, phaseDate));
  const message = isLoading
    ? "잠시만 기다려 주세요."
    : isError
      ? "눌러서 다시 시도해 주세요."
      : isUnknownPhase
        ? "날짜를 바꾸거나\n생리 기록을 확인해 주세요."
        : homeContent.message;

  const timeline = [
    ...new Set(
      Object.values(HOME_MENSTRUAL_STATUS_VIEW)
        .filter(({ phaseIndex }) => isEmpty ? phaseIndex < 4 : phaseIndex >= 0)
        .sort((a, b) => a.phaseIndex - b.phaseIndex)
        .map(({ phaseLabel }) => phaseLabel),
    ),
  ];

  const activePhaseIndex = timeline.indexOf(homeContent.phaseLabel);

  const progressPercent = ((activePhaseIndex + 0.5) / timeline.length) * 100;

  return (
    <button
      type="button"
      className={styles.root}
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

      {!isLoading && !isError && !isUnknownPhase && (
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
      <div className={styles.chatActionButton}>
        <p className="body-s-medium text-primary textCenter">지금 나에게 맞는 관리법 알아보기</p>
      </div>
    </button>
  );
}
