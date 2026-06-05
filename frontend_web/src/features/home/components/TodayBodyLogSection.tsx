import { useState } from "react";

import ActionCard from "@/features/home/components/cards/ActionCard";
import StepsLogBottomSheet from "@/features/home/components/sheets/StepsLogBottomSheet";
import WeightLogBottomSheet from "@/features/home/components/sheets/WeightLogBottomSheet";
import {
  useRegisterStepsMutation,
  useRegisterWeightMutation,
} from "@/features/home/hooks/mutations/useBodyLogMutation";
import { useGetBodyLog } from "@/features/home/hooks/queries/useBodyLogQuery";
import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import { isFutureDateKey } from "@/shared/utils/dateFormat";

type TodayMetricType = "weight" | "steps";

export default function TodayBodyLogSection({ date }: { date: string }) {
  const { data: bodyLog } = useGetBodyLog(date);
  const { data: profile } = useGetProfileQuery();
  const isFutureDate = isFutureDateKey(date);
  const displayWeight = bodyLog?.weight ?? (isFutureDate ? 0 : profile?.weight ?? 0);
  const initialWeight = bodyLog?.weight ?? (isFutureDate ? undefined : profile?.weight ?? 0);

  const { mutate: registerWeight, isPending: isWeightPending } = useRegisterWeightMutation({
    onSuccess: () => {
      toast.success("체중이 기록되었어요");
      closeEditor();
    },
    onError: () => {
      toast.error("체중 기록에 실패했어요");
    },
  });
  const { mutate: registerSteps, isPending: isStepsPending } = useRegisterStepsMutation({
    onSuccess: () => {
      toast.success("걸음 수가 기록되었어요");
      closeEditor();
    },
    onError: () => {
      toast.error("걸음 수 기록에 실패했어요");
    },
  });

  const [editingMetric, setEditingMetric] = useState<TodayMetricType | null>(null);
  const isSubmitPending = isWeightPending || isStepsPending;

  const closeEditor = () => {
    setEditingMetric(null);
  };

  const openWeightEditor = () => {
    setEditingMetric("weight");
  };

  const openStepsEditor = () => {
    setEditingMetric("steps");
  };

  const submitWeight = (weight: number) => {
    registerWeight({ date, weight });
  };

  const submitSteps = (steps: number) => {
    registerSteps({ date, steps });
  };

  return (
    <>
      <div className={style.todayContainer}>
        <TodayMetricCard
          title="체중"
          value={displayWeight}
          unit="kg"
          onClick={openWeightEditor}
        />
        <TodayMetricCard
          title="걸음 수"
          value={bodyLog?.steps ?? 0}
          unit="보"
          onClick={openStepsEditor}
        />
      </div>

      {editingMetric === "weight" ? (
        <WeightLogBottomSheet
          initialWeight={initialWeight}
          onClose={closeEditor}
          onSubmit={submitWeight}
        />
      ) : null}
      {editingMetric === "steps" ? (
        <StepsLogBottomSheet
          initialSteps={bodyLog?.steps ?? undefined}
          onClose={closeEditor}
          onSubmit={submitSteps}
        />
      ) : null}

      {isSubmitPending ? (
        <LoadingOverlay
          label={isWeightPending ? "체중을 기록하는 중입니다." : "걸음 수를 기록하는 중입니다."}
        />
      ) : null}
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
  onClick: () => void;
}) {
  return (
    <ActionCard onClick={onClick}>
      <div className={style.cardContainer}>
        <div className={style.cardTitleContainer}>
          <p className="typo-title4">{title}</p>
          <SystemIcon name="circle-plus-fill" mode="image" size={24} />
        </div>
        <div className={style.valueText}>
          <span className={`typo-h2 ${style.highlightValue}`}>{value.toLocaleString()}</span>
          <span className="typo-caption3">{unit}</span>
        </div>
      </div>
    </ActionCard>
  );
}
