import { subDays } from "date-fns";
import { useState } from "react";

import { LineChart } from "@/features/personal-analysis/components/LineChart";
import { usePersonalAnalysisByModeQuery } from "@/features/personal-analysis/hooks/queries/usePersonalAnalysis.query";
import styles from "@/features/personal-analysis/styles/PersonalAnalysisPage.module.css";
import { Button } from "@/shared/commons/button/Button";
import {
  formatDateKey,
  formatDotDate,
  getTodayFormatDateKey,
  parseDateKey,
} from "@/shared/utils/dateFormat";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

export default function PersonalAnalysisPage() {
  const today = getTodayFormatDateKey();
  const [standardDate] = useState(today);

  const startDate = formatDotDate(formatDateKey(subDays(parseDateKey(standardDate), 30)));
  const endDate = formatDotDate(standardDate);

  return (
    <div className={`page ${styles.root}`}>
      <header className={styles.header}>
        <h2 className="title-s-semi text-primary">분석</h2>
      </header>

      <div className={styles.dateSelectedSection}>
        <p className="body-xs-regular text-tertiary">
          {startDate} ~ {endDate}
        </p>
      </div>

      <main className={`main ${styles.content}`}>
        <DeficitCard date={today} />
        <IntakeCard date={today} />
        <BurnedCard date={today} />
        <WeightCard date={today} />
        <Button variant="outlined" border="primary" fullWidth className={styles.coachButton}>
          AI 코치에게 내 관리 패턴 분석받기
        </Button>
      </main>
    </div>
  );
}

function DeficitCard({ date }: { date: string }) {
  const mode = "deficit";
  const { data: deficit, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  if (isPending) return <p>불러오는 중...</p>;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  return (
    <section className={styles.analysisSection}>
      <div className={styles.titleGroup}>
        <h3 className="title-m-semi text-primary">칼로리 적자</h3>
        <p className="body-s-regular text-primary">섭취한 칼로리와 소모한 칼로리의 차이예요.</p>
      </div>
      <div className={styles.graphArea}>
        <LineChart<typeof mode> chartData={deficit ?? []} valueKey="calorie_deficit" />
      </div>
    </section>
  );
}
function IntakeCard({ date }: { date: string }) {
  const mode = "intake";
  const { data: intake, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  const averageKcal = intake
    ? formatDisplayNumber(
        intake.reduce((sum, value) => sum + value.intake_calories, 0) / intake.length,
      )
    : 0;

  if (isPending) return <p>불러오는 중...</p>;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  return (
    <section className={styles.analysisSection}>
      <div className={styles.titleGroup}>
        <h3 className="title-m-semi text-primary">섭취 칼로리</h3>
        <p className="body-s-regular text-primary">하루 평균 {averageKcal}kcal 섭취했어요.</p>
      </div>
      <div className={styles.graphArea}>
        <LineChart<typeof mode> chartData={intake ?? []} valueKey="intake_calories" />
      </div>
    </section>
  );
}
function BurnedCard({ date }: { date: string }) {
  const mode = "burned";
  const { data: burned, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  const averageBurned = burned
    ? formatDisplayNumber(
        burned.reduce((sum, value) => sum + value.total_burned_calories, 0) / burned.length,
      )
    : 0;

  if (isPending) return <p>불러오는 중...</p>;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  return (
    <section className={styles.analysisSection}>
      <div className={styles.titleGroup}>
        <h3 className="title-m-semi text-primary">소모 칼로리</h3>
        <p className="body-s-regular text-primary">하루 평균 {averageBurned}kcal 소모했어요.</p>
      </div>
      <div className={styles.graphArea}>
        <LineChart<typeof mode> chartData={burned ?? []} valueKey="total_burned_calories" />
      </div>
    </section>
  );
}
function WeightCard({ date }: { date: string }) {
  const mode = "weight";
  const { data: bodyWeight, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  const recentBodyWeight = bodyWeight?.at(-1)?.weight;

  if (isPending) return <p>불러오는 중...</p>;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  return (
    <section className={styles.analysisSection}>
      <div className={styles.titleGroup}>
        <h3 className="title-m-semi text-primary">체중 변화</h3>
        <p className="body-s-regular text-primary">최근 체중은 {recentBodyWeight}kg이에요.</p>
      </div>
      <div className={styles.graphArea}>
        <LineChart<typeof mode> chartData={bodyWeight ?? []} valueKey="weight" />
      </div>
    </section>
  );
}
