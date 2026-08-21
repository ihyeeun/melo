import type { ReactNode } from "react";

import MenstruationCalendar from "@/features/calendar/components/menstruation/MenstruationCalendar";
import styles from "@/features/menstruation/styles/MenstruationRecord.module.css";
import { Button } from "@/shared/commons/button/Button";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";

const AMOUNTS = [
  { type: "0", label: "적음" },
  { type: "1", label: "보통" },
  { type: "2", label: "많음" },
  { type: "3", label: "매우 많음" },
];

const SYMPTOMS = [
  { type: "0", label: "복통" },
  { type: "1", label: "허리 통증" },
  { type: "2", label: "두통" },
  { type: "3", label: "피로감" },
  { type: "4", label: "예민함" },
  { type: "5", label: "붓기" },
  { type: "6", label: "유방 통증" },
  { type: "7", label: "식욕 변화" },
];

export default function MenstruationRecordPage() {
  return (
    <div className={`page ${styles.root}`}>
      <PageHeader title={"생리 기록"} onBack={() => {}} />

      <main className={`main ${styles.content}`}>
        <section className={styles.monthlySection}>
          <MenstruationCalendar />
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

        <section className={styles.recordSection}>
          <SectionLayout title="생리 유무">
            <div className={styles.twoGrid}>
              <SelectedCard isSelected={true} className={styles.fieldCard}>
                <p className="body-m-regular text-primary">있음</p>
              </SelectedCard>
              <SelectedCard isSelected={false} className={styles.fieldCard}>
                <p className="body-m-regular text-primary">없음</p>
              </SelectedCard>
            </div>
          </SectionLayout>

          <SectionLayout title="생리 양" description="오늘의 생리 양은 어떤가요?">
            <div className={styles.fourGrid}>
              {AMOUNTS.map(({ label }) => {
                return (
                  <SelectedCard isSelected={false} className={styles.fieldCard}>
                    <p className="body-s-regular">{label}</p>
                  </SelectedCard>
                );
              })}
            </div>
          </SectionLayout>

          <SectionLayout title="증상 기록" description="해당되는 증상을 선택해주세요.">
            <div className={styles.twoGrid}>
              {SYMPTOMS.map(({ label }) => {
                return (
                  <SelectedCard isSelected={false} className={styles.fieldCard}>
                    {label}
                  </SelectedCard>
                );
              })}
            </div>
          </SectionLayout>
        </section>
      </main>

      <footer className="footer">
        <Button onClick={() => {}} fullWidth size="m">
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
