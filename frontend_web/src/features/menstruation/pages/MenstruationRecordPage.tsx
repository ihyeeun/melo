import { useState } from "react";

import MenstruationCalendar from "@/features/calendar/components/menstruation/MenstruationCalendar";
import styles from "@/features/menstruation/styles/MenstruationRecord.module.css";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { navigateBack } from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isFutureDateKey } from "@/shared/utils/dateFormat";

export default function MenstruationRecordPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayFormatDateKey());
  const isFutureDate = isFutureDateKey(selectedDate);

  if (isFutureDate) {
    return;
  }

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
      </main>
    </div>
  );
}
