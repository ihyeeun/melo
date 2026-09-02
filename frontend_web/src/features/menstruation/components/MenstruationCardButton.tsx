import {
  HOME_DELAYED_CONTENT,
  HOME_MENSTRUAL_STATUS_VIEW,
  MENSTRUAL_PHASE_ORDER,
} from "@/features/menstruation/constants/menstruation.constant";
import styles from "@/features/menstruation/styles/MenstruationCardButton.module.css";
import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

const PHASE_TIMELINE = [...MENSTRUAL_PHASE_ORDER, MENSTRUAL_PHASE_ORDER[0]].map((status) => ({
  status,
  label: HOME_MENSTRUAL_STATUS_VIEW[status].phaseLabel,
}));
const DELAYED_TIMELINE = [
  ...MENSTRUAL_PHASE_ORDER.map((status) => ({
    status,
    label: HOME_MENSTRUAL_STATUS_VIEW[status].phaseLabel,
  })),
  {
    status: "delayed",
    label: HOME_DELAYED_CONTENT.phaseLabel,
  },
];

const EMPTY_PHASE_CONTENT = {
  title: "생리 기록을 시작해 볼까요?",
  message: "주기에 맞춰\n 식단과 운동을 \n더 똑똑하게 관리해봐요!",
  source: "/icons/characters/question-color.png",
} as const;

export default function MenstruationCardButton({
  menstrualStatus,
  isDelayed,
}: {
  menstrualStatus: MenstrualStatus | null;
  isDelayed: boolean;
}) {
  const navigate = useNavigate();
  const statusView = menstrualStatus ? HOME_MENSTRUAL_STATUS_VIEW[menstrualStatus] : null;
  const isEmpty = statusView === null && !isDelayed;
  const homeContent = isDelayed ? HOME_DELAYED_CONTENT : (statusView ?? EMPTY_PHASE_CONTENT);
  const timeline = isDelayed ? DELAYED_TIMELINE : PHASE_TIMELINE;

  const activePhaseIndex = isEmpty
    ? -1
    : isDelayed
      ? timeline.length - 1
      : (statusView?.phaseIndex ?? -1);
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

      {isEmpty ? (
        <span className={`${styles.emptyAction} body-m-regular`}>
          생리 기록 시작하기
          <SystemIcon name="chevron-right" size={14} />
        </span>
      ) : (
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
                  key={`${timelineStep.status}-${index}`}
                >
                  <span className={styles.dotArea}>
                    <span className={styles.dot} />
                  </span>
                  <span className={`${styles.phaseLabel} body-xs-regular`}>
                    {timelineStep.label}
                  </span>
                </span>
              );
            })}
          </span>
        </span>
      )}
    </button>
  );
}
