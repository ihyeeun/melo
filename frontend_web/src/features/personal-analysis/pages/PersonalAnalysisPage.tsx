import { Tabs } from "@base-ui/react";
import { subDays } from "date-fns";
import { useState } from "react";

import { LineChart } from "@/features/personal-analysis/components/LineChart";
import { usePersonalAnalysisByModeQuery } from "@/features/personal-analysis/hooks/queries/usePersonalAnalysis.query";
import styles from "@/features/personal-analysis/styles/PersonalAnalysisPage.module.css";
import { PATH } from "@/router/path";
import { Button } from "@/shared/commons/button/Button";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { isFreeUserGuardEnabled } from "@/shared/guards/featureGuard";
import { navigate } from "@/shared/navigation/stackflowNavigation";
import {
  formatDateKey,
  formatDotDate,
  getTodayFormatDateKey,
  parseDateKey,
} from "@/shared/utils/dateFormat";
import { formatDisplayNumber } from "@/shared/utils/numberFormat";

export default function PersonalAnalysisPage() {
  const isFree = isFreeUserGuardEnabled();
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
        {!isFree && (
          <Button
            onClick={() => {
              navigate(PATH.AI_CHAT, { state: { type: "management-pattern-analysis" } });
            }}
            variant="outlined"
            border="primary"
            fullWidth
            className={styles.coachButton}
          >
            AI 코치에게 내 관리 패턴 분석받기
          </Button>
        )}
      </main>
    </div>
  );
}

function DeficitCard({ date }: { date: string }) {
  const mode = "deficit";
  const title = "칼로리 적자";
  const { data: deficit, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  if (isPending) return <SkeletonChart title={title} />;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  const isEmpty = (deficit?.length ?? 0) === 0;

  return (
    <section className={styles.analysisSection}>
      <div data-isEmpty={isEmpty} className={styles.blur}>
        <div className={styles.titleGroup}>
          <div className={styles.titlePopover}>
            <h3 className="title-m-semi text-primary">{title}</h3>
            <InfoPopover iconSize={18} align="start">
              기초대사량을 포함한 <br />총 소모 칼로리를 기준으로 계산해요
            </InfoPopover>
          </div>
          <p className="body-s-regular text-primary">섭취한 칼로리와 소모한 칼로리의 차이예요.</p>
        </div>
        <div className={styles.graphArea}>
          <LineChart<typeof mode> chartData={deficit} valueKey="calorie_deficit" />
        </div>
      </div>
      {isEmpty && (
        <div className={styles.emptyOverlay} role="status">
          <p className={`body-l-medium text-secondary ${styles.emptyText}`}>
            최근 30일 내 기록이 없습니다
          </p>
        </div>
      )}
    </section>
  );
}
function IntakeCard({ date }: { date: string }) {
  const mode = "intake";
  const title = "섭취 칼로리";
  const { data: intake, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  const averageKcal =
    intake && intake.length > 0
      ? formatDisplayNumber(
          intake.reduce((sum, value) => sum + value.intake_calories, 0) / intake.length,
        )
      : 0;

  if (isPending) return <SkeletonChart title={title} />;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  const isEmpty = (intake?.length ?? 0) === 0;

  return (
    <section className={styles.analysisSection}>
      <div data-isEmpty={isEmpty} className={styles.blur}>
        <div className={styles.titleGroup}>
          <h3 className="title-m-semi text-primary">{title}</h3>
          <p className="body-s-regular text-primary">하루 평균 {averageKcal}kcal 섭취했어요.</p>
        </div>
        <div className={styles.graphArea}>
          <LineChart<typeof mode> chartData={intake} valueKey="intake_calories" />
        </div>
      </div>
      {isEmpty && (
        <div className={styles.emptyOverlay} role="status">
          <p className={`body-l-medium text-secondary ${styles.emptyText}`}>
            최근 30일 내 기록이 없습니다
          </p>
        </div>
      )}
    </section>
  );
}

const TABS = [
  { value: "total_burned_calories", label: "총합" },
  { value: "steps_burned_calories", label: "걸음" },
  { value: "workout_burned_calories", label: "운동" },
];
function BurnedCard({ date }: { date: string }) {
  const mode = "burned";
  const title = "소모 칼로리";
  const { data: burned, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  const averageBurned =
    burned && burned.length > 0
      ? formatDisplayNumber(
          burned.reduce((sum, value) => sum + value.total_burned_calories, 0) / burned.length,
        )
      : 0;

  if (isPending) return <SkeletonChart title={title} />;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  const isEmpty = (burned?.length ?? 0) === 0;

  return (
    <section className={styles.analysisSection}>
      <div data-isEmpty={isEmpty} className={styles.blur}>
        <div className={styles.titleGroup}>
          <h3 className="title-m-semi text-primary">{title}</h3>
          <p className="body-s-regular text-primary">하루 평균 {averageBurned}kcal 소모했어요.</p>
        </div>
        <Tabs.Root defaultValue="total_burned_calories">
          <Tabs.List className={styles.tabList}>
            {TABS.map((tab) => (
              <Tabs.Tab value={tab.value} className={`${styles.tabItem} body-s-medium`}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {TABS.map((tab) => (
            <Tabs.Panel key={tab.value} value={tab.value} className={styles.graphArea}>
              <LineChart<typeof mode> chartData={burned} valueKey={tab.value} />
            </Tabs.Panel>
          ))}
        </Tabs.Root>
      </div>
      {isEmpty && (
        <div className={styles.emptyOverlay} role="status">
          <p className={`body-l-medium text-secondary ${styles.emptyText}`}>
            최근 30일 내 기록이 없습니다
          </p>
        </div>
      )}
    </section>
  );
}
function WeightCard({ date }: { date: string }) {
  const mode = "weight";
  const title = "체중 변화";
  const { data: bodyWeight, isPending, isError } = usePersonalAnalysisByModeQuery({ date, mode });

  const recentBodyWeight = bodyWeight?.at(-1)?.weight;

  if (isPending) return <SkeletonChart title={title} />;
  if (isError) return <p>데이터를 불러오지 못했어요.</p>;

  const isEmpty = (bodyWeight?.length ?? 0) === 0;

  return (
    <section className={styles.analysisSection}>
      <div data-isEmpty={isEmpty} className={styles.blur}>
        <div className={styles.titleGroup}>
          <h3 className="title-m-semi text-primary">{title}</h3>
          <p className="body-s-regular text-primary">최근 체중은 {recentBodyWeight}kg이에요.</p>
        </div>
        <div className={styles.graphArea}>
          <LineChart<typeof mode> chartData={bodyWeight} valueKey="weight" />
        </div>
      </div>
      {isEmpty && (
        <div className={styles.emptyOverlay} role="status">
          <p className={`body-l-medium text-secondary ${styles.emptyText}`}>
            최근 30일 내 기록이 없습니다
          </p>
        </div>
      )}
    </section>
  );
}

function SkeletonChart({ title }: { title: string }) {
  return (
    <section className={styles.analysisSection}>
      <div className={styles.titleGroup}>
        <h3 className="title-m-semi text-primary">{title}</h3>
        <Skeleton width={230} height={20} />
      </div>
      <div className={styles.graphArea}>
        <Skeleton width="100%" height="100%" />
      </div>
    </section>
  );
}
