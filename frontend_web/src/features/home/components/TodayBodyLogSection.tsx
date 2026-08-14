import { useSyncNativeStepCount } from "@/features/health/hooks/useSyncNativeStepCount";
import ActionCard from "@/features/home/components/cards/ActionCard";
import { useGetBodyLog } from "@/features/home/hooks/queries/useTodayRecordQuery";
import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isFutureDateKey } from "@/shared/utils/dateFormat";

export default function TodayBodyLogSection({ date }: { date: string }) {
  const navigate = useNavigate();
  const { data: bodyLog } = useGetBodyLog(date);
  const { data: profile } = useGetProfileQuery();
  const isToday = date === getTodayFormatDateKey();
  const isFutureDate = isFutureDateKey(date);
  const isBodyLogLoaded = bodyLog !== undefined;
  const displayWeight = bodyLog?.weight ?? (isToday ? (profile?.weight ?? 0) : 0);
  const displaySteps = bodyLog?.steps ?? 0;
  const { nativeStepConnectionStatus } = useSyncNativeStepCount(date, {
    enabled: isBodyLogLoaded && !isFutureDate,
    savedSteps: bodyLog?.steps,
  });

  const getSheetPath = (pathname: string, params?: Record<string, string>) => {
    const searchParams = new URLSearchParams({ date, ...params });

    return `${pathname}?${searchParams.toString()}`;
  };

  const openWeightEditor = () => {
    navigate(getSheetPath(PATH.HOME_WEIGHT_LOG_SHEET));
  };

  const openStepsEditor = () => {
    navigate(
      getSheetPath(PATH.HOME_STEPS_LOG_SHEET, {
        nativeStepConnectionStatus,
      }),
    );
  };

  return (
    <>
      <div className={style.todayContainer}>
        <TodayMetricCard title="걸음 수" value={displaySteps} unit="보" onClick={openStepsEditor} />
        <TodayMetricCard title="체중" value={displayWeight} unit="kg" onClick={openWeightEditor} />
      </div>
    </>
  );
}

function TodayMetricCard({
  title,
  value,
  unit,
  onClick,
}: {
  title: string;
  value: number;
  unit: string;
  onClick?: () => void;
}) {
  return (
    <ActionCard onClick={onClick}>
      <div className={style.cardContainer}>
        <div className={style.cardTitleContainer}>
          <p className="typo-title4">{title}</p>
          <SystemIcon name="plus-circle" size={18} />
        </div>
        <div className={style.valueText}>
          <span className={`typo-h2 amp-mask ${style.highlightValue}`}>
            {value.toLocaleString()}
          </span>
          <span className="typo-caption3">{unit}</span>
        </div>
      </div>
    </ActionCard>
  );
}
