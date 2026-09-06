import { HOME_MENSTRUAL_STATUS_VIEW } from "@/features/menstruation/constants/menstruation.constant";
import styles from "@/features/menstruation/styles/MenstruationCardButton.module.css";
import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

export default function MenstruationCardButton() {
  const menstrualStatus: MenstrualStatus = undefined;
  const navigate = useNavigate();
  const homeContent = menstrualStatus
    ? HOME_MENSTRUAL_STATUS_VIEW[menstrualStatus]
    : HOME_MENSTRUAL_STATUS_VIEW["undefined"];

  const isEmpty = menstrualStatus === undefined;

  const timeline = [
    ...new Set(
      Object.values(HOME_MENSTRUAL_STATUS_VIEW)
        .filter(({ phaseIndex }) => isEmpty || phaseIndex >= 0)
        .sort((a, b) => a.phaseIndex - b.phaseIndex)
        .map(({ phaseLabel }) => phaseLabel),
    ),
    ...(isEmpty ? [] : ["생리 예정"]),
  ];

  const activePhaseIndex = timeline.indexOf(homeContent.phaseLabel);

  const progressPercent = ((activePhaseIndex + 0.5) / timeline.length) * 100;

  return (
    <button
      type="button"
      className={styles.root}
      aria-label={
        isEmpty
          ? `${homeContent.title}. ${homeContent.message} 생리 기록 시작하기`
          : `${homeContent.title}. ${homeContent.message} 생리 주기 기록 보기`
      }
      onClick={() => {
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

      <span className={`${styles.title} title-s-semi text-primary`}>{homeContent.title}</span>
      <span className={styles.messageBubble}>{homeContent.message}</span>

      <span className={`${styles.actionButton} caption-s-medium text-tertiary`}>
        기록
        <SystemIcon name="chevron-right" size={11} />
      </span>

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
    </button>
  );
}
