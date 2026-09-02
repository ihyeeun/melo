import { type ReactNode, useState } from "react";

import MenstruationCalendar from "@/features/calendar/components/menstruation/MenstruationCalendar";
import {
  useDeleteMenstrualCycleMutation,
  useSaveMenstrualRecordMutation,
} from "@/features/menstruation/hooks/mutations/menstruation.mutation";
import {
  useGetMenstrualRecordedQuery,
} from "@/features/menstruation/hooks/queries/menstruation.query";
import { useMenstrualHistoryCoverage } from "@/features/menstruation/hooks/useMenstrualHistoryCoverage";
import styles from "@/features/menstruation/styles/MenstruationRecord.module.css";
import {
  MENSTRUATION_FLOW,
  MENSTRUATION_STATUS,
  MENSTRUATION_SYMPTOM,
  type MenstruationFlow,
  type MenstruationStatus,
  type MenstruationSymptom,
} from "@/features/menstruation/types/menstruation.type";
import { getCycleIdToDeleteForFirstDayNotBleeding } from "@/features/menstruation/utils/menstrualRecordDecision.util";
import type { MenstraulRecordReponseDto } from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingOverlay } from "@/shared/commons/loading/Loading";
import { ConfirmModal } from "@/shared/commons/modals/ConfirmModal";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey } from "@/shared/utils/dateFormat";

const AMOUNTS = [
  {
    value: MENSTRUATION_FLOW.LIGHT,
    label: "적음",
    iconCount: 1,
  },
  {
    value: MENSTRUATION_FLOW.MEDIUM,
    label: "보통",
    iconCount: 2,
  },
  {
    value: MENSTRUATION_FLOW.HEAVY,
    label: "많음",
    iconCount: 3,
  },
  {
    value: MENSTRUATION_FLOW.VERY_HEAVY,
    label: "매우 많음",
    iconCount: 4,
  },
];

type MenstruationFormValues = {
  menstruationStatus: MenstruationStatus;
  flow: MenstruationFlow | undefined;
  symptoms: MenstruationSymptom[] | undefined;
};

export default function MenstruationRecordPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayFormatDateKey());
  const [cycleIdPendingDeletion, setCycleIdPendingDeletion] = useState<number | null>(null);
  const recordMenstrualQuery = useGetMenstrualRecordedQuery(selectedDate);
  const menstrualHistory = useMenstrualHistoryCoverage({ targetDate: selectedDate });
  const saveMenstrualRecordMutation = useSaveMenstrualRecordMutation({
    onSuccess: () => {
      toast.success("기록되었어요");
    },
  });
  const deleteMenstrualCycleMutation = useDeleteMenstrualCycleMutation();
  const MENSTRUATION_RECORD_FORM_ID = "menstruation-record-form";

  const handleSave = (values: MenstruationFormValues) => {
    if (!recordMenstrualQuery.isSuccess || !menstrualHistory.isContextReady) return;

    const cycle = menstrualHistory.ownerCycle;

    const cycleIdToDelete = getCycleIdToDeleteForFirstDayNotBleeding({
      cycle,
      existingRecord: recordMenstrualQuery.data.record,
      menstruationStatus: values.menstruationStatus,
      targetDate: selectedDate,
    });

    if (cycleIdToDelete !== null) {
      setCycleIdPendingDeletion(cycleIdToDelete);
      return;
    }

    saveMenstrualRecordMutation.mutate({
      date: selectedDate,
      menstruationStatus: values.menstruationStatus,
      flow: values.flow,
      symptoms: values.symptoms,
      existingRecord: recordMenstrualQuery.data.record,
      cycle,
    });
  };

  const handleDeleteCycleConfirm = async () => {
    if (cycleIdPendingDeletion === null || deleteMenstrualCycleMutation.isPending) return;

    try {
      await deleteMenstrualCycleMutation.mutateAsync(cycleIdPendingDeletion);
      toast.success("생리 기록이 삭제되었어요");
    } catch (error) {
      toast.warning("생리 기록 삭제에 실패했어요", "잠시 후 다시 시도해주세요.");
      throw error;
    }
  };

  return (
    <div className={`page ${styles.root}`}>
      <PageHeader
        title={"생리 기록"}
        onBack={() => {
          navigateBack();
        }}
      />

      <main className={`main ${styles.content}`}>
        <section className={styles.monthlySection}>
          <MenstruationCalendar onSelectedDate={setSelectedDate} />
          <div className={styles.monthlyCaption}>
            <p className="body-xs-regular text-secondary">
              <span className={styles.dot} data-variant="outlined" />
              생리 예정일
            </p>
            <p className="body-xs-regular text-secondary">
              <span className={styles.dot} data-variant="filled" />
              생리일
            </p>
          </div>
        </section>

        {recordMenstrualQuery.isError && <p>기록을 불러오지 못했습니다.</p>}

        {menstrualHistory.status === "error" && <p>생리 회차를 불러오지 못했습니다.</p>}

        {recordMenstrualQuery.isPending && <FormSkeleton />}

        {recordMenstrualQuery.isSuccess && (
          <MenstruationRecordForm
            key={`${selectedDate}-${recordMenstrualQuery.data.record?.cycle_id ?? "empty"}`}
            formId={MENSTRUATION_RECORD_FORM_ID}
            onSubmit={handleSave}
            initRecord={recordMenstrualQuery.data.record}
            isSubmitting={
              !menstrualHistory.isContextReady ||
              saveMenstrualRecordMutation.isPending ||
              deleteMenstrualCycleMutation.isPending
            }
          />
        )}
      </main>

      <ConfirmModal
        open={cycleIdPendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setCycleIdPendingDeletion(null);
        }}
        title="이 회차의 생리 기록을 삭제할까요?"
        description={"첫날의 기록을 '없음'으로 변경하면\n이 회차의 생리 기록이 모두 삭제돼요."}
        cancelText="취소"
        confirmText="전체 삭제"
        confirmDisabled={deleteMenstrualCycleMutation.isPending}
        closeOnConfirm={false}
        onConfirm={handleDeleteCycleConfirm}
      />

      {deleteMenstrualCycleMutation.isPending ? (
        <LoadingOverlay label="생리 기록을 삭제하는 중입니다." />
      ) : null}
    </div>
  );
}

function SectionLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.sectionGroup}>
      <div className={styles.titleArea}>
        <p className="title-s-semi text-primary">{title}</p>
        {description && <p className="body-s-regular text-tertiary">{description}</p>}
      </div>

      {children}
    </div>
  );
}

function MenstruationRecordForm({
  formId,
  onSubmit,
  initRecord,
  isSubmitting,
}: {
  formId: string;
  onSubmit: (values: MenstruationFormValues) => void;
  initRecord: MenstraulRecordReponseDto["record"];
  isSubmitting: boolean;
}) {
  const hasInitialBleeding = initRecord?.menstruation_status === MENSTRUATION_STATUS.BLEEDING;
  const [menstrualStatus, setMenstrualStatus] = useState<MenstruationStatus | null>(
    () => initRecord?.menstruation_status ?? null,
  );
  const [flow, setFlow] = useState<MenstruationFlow | undefined>(() =>
    hasInitialBleeding ? initRecord.flow : undefined,
  );
  const [symptoms, setSymptoms] = useState<MenstruationSymptom[]>(() =>
    hasInitialBleeding ? [...(initRecord.symptoms ?? [])] : [],
  );
  const areDetailsDisabled = menstrualStatus === MENSTRUATION_STATUS.NOT_BLEEDING;

  const handleSymptomToggle = (symptom: MenstruationSymptom) => {
    setSymptoms((previous) => {
      const isAlreadySelected = previous.includes(symptom);

      if (isAlreadySelected) {
        return previous.filter((item) => item !== symptom);
      }

      return [...previous, symptom];
    });
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!menstrualStatus) return;

    onSubmit({
      menstruationStatus: menstrualStatus,
      flow: areDetailsDisabled ? undefined : flow,
      symptoms: areDetailsDisabled ? undefined : symptoms,
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className={styles.recordSection}>
      <SectionLayout title="생리 유무">
        <div className={styles.twoGrid}>
          <SelectedCard
            isSelected={menstrualStatus === MENSTRUATION_STATUS.BLEEDING}
            className={styles.fieldCard}
            setSelectedChange={() => setMenstrualStatus(MENSTRUATION_STATUS.BLEEDING)}
          >
            <p className="body-m-regular text-primary">있음</p>
          </SelectedCard>
          <SelectedCard
            isSelected={menstrualStatus === MENSTRUATION_STATUS.NOT_BLEEDING}
            className={styles.fieldCard}
            setSelectedChange={() => {
              setMenstrualStatus(MENSTRUATION_STATUS.NOT_BLEEDING);
              setFlow(undefined);
              setSymptoms([]);
            }}
          >
            <p className="body-m-regular text-primary">없음</p>
          </SelectedCard>
        </div>
      </SectionLayout>

      <SectionLayout
        title="생리 양"
        description={
          areDetailsDisabled ? "생리가 있는 날에만 기록할 수 있어요." : "오늘의 생리 양은 어떤가요?"
        }
      >
        <div className={styles.fourGrid}>
          {AMOUNTS.map(({ value, label, iconCount }) => {
            return (
              <SelectedCard
                key={value}
                isSelected={flow === value}
                disabled={areDetailsDisabled}
                setSelectedChange={() => {
                  setFlow(value);
                }}
                className={styles.fieldCard}
              >
                <span className={styles.amountIcons} aria-hidden="true">
                  {Array.from({ length: iconCount }, (_, iconIndex) => (
                    <SystemIcon key={iconIndex} name="humidity" size={12} />
                  ))}
                </span>
                <p className="body-s-regular text-primary">{label}</p>
              </SelectedCard>
            );
          })}
        </div>
      </SectionLayout>

      <SectionLayout
        title="증상 기록"
        description={
          areDetailsDisabled
            ? "생리가 있는 날에만 기록할 수 있어요."
            : "해당되는 증상을 선택해주세요."
        }
      >
        <div className={styles.twoGrid}>
          {Object.values(MENSTRUATION_SYMPTOM).map((symptom) => {
            return (
              <SelectedCard
                key={symptom}
                isSelected={symptoms.includes(symptom)}
                disabled={areDetailsDisabled}
                setSelectedChange={() => {
                  handleSymptomToggle(symptom);
                }}
                className={`${styles.fieldCard} body-m-regular text-primary`}
              >
                {symptom}
              </SelectedCard>
            );
          })}
        </div>
      </SectionLayout>

      <footer className={styles.footer}>
        <Button
          type="submit"
          disabled={menstrualStatus === null || isSubmitting}
          fullWidth
          size="m"
        >
          기록 저장하기
        </Button>
      </footer>
    </form>
  );
}

function FormSkeleton() {
  return (
    <SkeletonStatus className={styles.recordSection} label="생리 기록을 불러오는 중입니다">
      <SectionLayout title="생리 유무">
        <div className={styles.twoGrid}>
          <Skeleton width="100%" height={49} radius={16} />
          <Skeleton width="100%" height={49} radius={16} />
        </div>
      </SectionLayout>

      <SectionLayout title="생리 양" description="오늘의 생리 양은 어떤가요?">
        <div className={styles.fourGrid}>
          {Array.from({ length: 4 }, (_, idx) => (
            <Skeleton key={idx} width="100%" height={68} radius={16} />
          ))}
        </div>
      </SectionLayout>

      <SectionLayout title="증상 기록" description="해당되는 증상을 선택해주세요.">
        <div className={styles.twoGrid} />
      </SectionLayout>
    </SkeletonStatus>
  );
}
