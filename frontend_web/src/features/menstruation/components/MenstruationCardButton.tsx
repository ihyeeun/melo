import {
  HOME_PHASE_CONTENT,
  MENSTRUAL_PHASE_ORDER,
} from "@/features/menstruation/constants/menstruation.constant";
import { useGetMenstruationCyclesQuery } from "@/features/menstruation/hooks/queries/menstruation.query";
import styles from "@/features/menstruation/styles/MenstruationCardButton.module.css";
import { getMenstrualPhaseByDate } from "@/features/menstruation/utils/menstruation.util";
import { PATH } from "@/router/path";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

const PHASE_TIMELINE = [...MENSTRUAL_PHASE_ORDER, MENSTRUAL_PHASE_ORDER[0]];

export default function MenstruationCardButton() {
  const navigate = useNavigate();
  const selectedDate = useSelectedDateKey();
  const { data: menstruationData } = useGetMenstruationCyclesQuery({
    date: selectedDate,
    limit: 7,
  });
  const currentPhase = getMenstrualPhaseByDate(menstruationData?.cycles ?? [], selectedDate);
  const homeContent = currentPhase ? HOME_PHASE_CONTENT[currentPhase] : null;

  if (!currentPhase || !homeContent) return null;

  const activePhaseIndex = MENSTRUAL_PHASE_ORDER.indexOf(currentPhase);
  const progressPercent = ((activePhaseIndex + 0.5) / PHASE_TIMELINE.length) * 100;

  return (
    <button
      type="button"
      className={styles.root}
      aria-label={`${homeContent.title}. ${homeContent.message} 생리 주기 기록 보기`}
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

      <span className={styles.stepper} aria-hidden="true">
        <span className={styles.track}>
          <span className={styles.progress} style={{ width: `${progressPercent}%` }} />
        </span>

        <span className={styles.phaseList}>
          {PHASE_TIMELINE.map((phase, index) => {
            const phaseState =
              index < activePhaseIndex
                ? styles.completed
                : index === activePhaseIndex
                  ? styles.current
                  : styles.upcoming;

            return (
              <span className={`${styles.phaseItem} ${phaseState}`} key={`${phase}-${index}`}>
                <span className={styles.dotArea}>
                  <span className={styles.dot} />
                </span>
                <span className={`${styles.phaseLabel} body-xs-regular`}>
                  {HOME_PHASE_CONTENT[phase].phaseLabel}
                </span>
              </span>
            );
          })}
        </span>
      </span>
    </button>
  );
}
