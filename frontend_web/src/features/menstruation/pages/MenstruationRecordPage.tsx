import styles from "@/features/menstruation/styles/MenstruationRecord.module.css";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { navigateBack } from "@/shared/navigation/stackflowNavigation";

export default function MenstruationRecordPage() {
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
