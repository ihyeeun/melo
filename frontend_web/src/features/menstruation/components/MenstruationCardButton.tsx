import {
  HOME_PHASE_CONTENT,
  MENSTRUAL_PHASE_ORDER,
} from "@/features/menstruation/constants/menstruation.constant";
import styles from "@/features/menstruation/styles/MenstruationCardButton.module.css";
import type { MenstrualPhase } from "@/features/menstruation/types/menstruation.type";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

const PHASE_TIMELINE = [...MENSTRUAL_PHASE_ORDER, MENSTRUAL_PHASE_ORDER[0]];

const EMPTY_PHASE_CONTENT = {
  title: "생리 기록을 시작해 볼까요?",
  message: "주기에 맞춰\n 식단과 운동을 \n더 똑똑하게 관리해봐요!",
  source: "/icons/characters/question-color.png",
} as const;

export default function MenstruationCardButton({ phase }: { phase: MenstrualPhase | null }) {
  const navigate = useNavigate();
  const isEmpty = phase === null;
  const homeContent = isEmpty ? EMPTY_PHASE_CONTENT : HOME_PHASE_CONTENT[phase];

  const activePhaseIndex = isEmpty ? -1 : MENSTRUAL_PHASE_ORDER.indexOf(phase);
  const progressPercent = ((activePhaseIndex + 0.5) / PHASE_TIMELINE.length) * 100;

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
            {PHASE_TIMELINE.map((timelinePhase, index) => {
              const phaseState =
                index < activePhaseIndex
                  ? styles.completed
                  : index === activePhaseIndex
                    ? styles.current
                    : styles.upcoming;

              return (
                <span
                  className={`${styles.phaseItem} ${phaseState}`}
                  key={`${timelinePhase}-${index}`}
                >
                  <span className={styles.dotArea}>
                    <span className={styles.dot} />
                  </span>
                  <span className={`${styles.phaseLabel} body-xs-regular`}>
                    {HOME_PHASE_CONTENT[timelinePhase].phaseLabel}
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
