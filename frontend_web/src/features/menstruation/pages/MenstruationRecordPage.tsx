import { type ReactNode, useState } from "react";

import MenstruationCalendar from "@/features/calendar/components/menstruation/MenstruationCalendar";
import { useGetMenstrualRecordedQuery } from "@/features/menstruation/hooks/queries/menstruation.query";
import styles from "@/features/menstruation/styles/MenstruationRecord.module.css";
import {
  MENSTRUATION_FLOW,
  MENSTRUATION_STATUS,
  MENSTRUATION_SYMPTOM,
  type MenstruationFlow,
  type MenstruationRecordedItem,
  type MenstruationStatus,
  type MenstruationSymptom,
} from "@/features/menstruation/types/menstruation.type";
import { Button } from "@/shared/commons/button/Button";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
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

const SYMPTOMS = [
  {
    value: MENSTRUATION_SYMPTOM.ABDOMINAL_PAIN,
    label: "복통",
  },
  {
    value: MENSTRUATION_SYMPTOM.BACK_PAIN,
    label: "허리 통증",
  },
  {
    value: MENSTRUATION_SYMPTOM.HEADACHE,
    label: "두통",
  },
  {
    value: MENSTRUATION_SYMPTOM.FATIGUE,
    label: "피로감",
  },
  {
    value: MENSTRUATION_SYMPTOM.SENSITIVITY,
    label: "예민함",
  },
  {
    value: MENSTRUATION_SYMPTOM.SWELLING,
    label: "붓기",
  },
  {
    value: MENSTRUATION_SYMPTOM.BREAST_PAIN,
    label: "유방 통증",
  },
  {
    value: MENSTRUATION_SYMPTOM.APPETITE_CHANGE,
    label: "식욕 변화",
  },
];

type MenstruationFormValues = {
  menstruationStatus: MenstruationStatus;
  flow: MenstruationFlow | null;
  symptoms: MenstruationSymptom[];
};

export default function MenstruationRecordPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayFormatDateKey());
  const recordMenstrualQuery = useGetMenstrualRecordedQuery(selectedDate);
  const MENSTRUATION_RECORD_FORM_ID = "menstruation-record-form";

  const handleSave = (values: MenstruationFormValues) => {
    const request = {
      date: selectedDate,
      menstruation_status: values.menstruationStatus,
      flow: values.flow,
      symptoms: values.symptoms,
    };

    console.log(request);
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

        {recordMenstrualQuery.isPending && <p>기록을 불러오는 중...</p>}

        {recordMenstrualQuery.isError && <p>기록을 불러오지 못했습니다.</p>}

        {recordMenstrualQuery.isSuccess && (
          <MenstruationRecordForm
            key={selectedDate}
            formId={MENSTRUATION_RECORD_FORM_ID}
            onSubmit={handleSave}
            initRecord={recordMenstrualQuery.data?.record}
          />
        )}
      </main>

      <footer className="footer">
        <Button
          type="submit"
          form={MENSTRUATION_RECORD_FORM_ID}
          disabled={!recordMenstrualQuery.isSuccess}
          fullWidth
          size="m"
        >
          기록 저장하기
        </Button>
      </footer>
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
}: {
  formId: string;
  onSubmit: (values: MenstruationFormValues) => void;
  initRecord: MenstruationRecordedItem["record"];
}) {
  const [menstrualStatus, setMenstrualStatus] = useState<MenstruationStatus | null>(
    () => initRecord?.menstruation_status ?? null,
  );
  const [flow, setFlow] = useState<MenstruationFlow | null>(() => initRecord.flow ?? null);
  const [symptoms, setSymptoms] = useState<MenstruationSymptom[]>(() => [
    ...(initRecord.symptoms ?? []),
  ]);

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
      flow,
      symptoms,
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
              setFlow(null);
            }}
          >
            <p className="body-m-regular text-primary">없음</p>
          </SelectedCard>
        </div>
      </SectionLayout>

      <SectionLayout title="생리 양" description="오늘의 생리 양은 어떤가요?">
        <div className={styles.fourGrid}>
          {AMOUNTS.map(({ value, label, iconCount }) => {
            return (
              <SelectedCard
                key={value}
                isSelected={flow === value}
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

      <SectionLayout title="증상 기록" description="해당되는 증상을 선택해주세요.">
        <div className={styles.twoGrid}>
          {SYMPTOMS.map(({ value, label }) => {
            return (
              <SelectedCard
                key={value}
                isSelected={symptoms.includes(value)}
                setSelectedChange={() => {
                  handleSymptomToggle(value);
                }}
                className={`${styles.fieldCard} body-m-regular text-primary`}
              >
                {label}
              </SelectedCard>
            );
          })}
        </div>
      </SectionLayout>
    </form>
  );
}
