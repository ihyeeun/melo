import { usePlotArea, useXAxisScale, ZIndexLayer } from "recharts";

import { useMenstrualPhase } from "@/features/menstruation/hooks/useMenstrualPhase";
import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import { selectMenstrualCycleContext } from "@/features/menstruation/utils/menstrualCycleContext.util";
import {
  calculateMenstrualPhaseDates,
  getMenstrualTypeFromPhase,
} from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { useIsMenstrualPhaseVisible } from "@/features/personal-analysis/stores/menstrualPhaseSetting.store";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";

const PHASE_VIEW = {
  menstrual_recorded: { label: "월경기", fill: "var(--coral-200)" },
  follicular: { label: "난포기", fill: "var(--coral-100)" },
  ovulatory: { label: "배란기", fill: "var(--coral-50)" },
  luteal: { label: "황체기", fill: "var(--coral-100)" },
} satisfies Record<
  Exclude<NonNullable<MenstrualStatus>, "next_predicted">,
  { label: string; fill: string }
>;

type PhaseStatus = keyof typeof PHASE_VIEW;

type PhaseRange = {
  status: PhaseStatus;
  startIndex: number;
  endIndex: number;
};

export function MenstrualPhaseBackground({ data }: { data: readonly { date: string }[] }) {
  const { data: profile } = useGetProfileQuery();
  const isFemale = profile?.gender === 1;
  // 분석 화면 상단 토글로 켰을 때만 그린다. 꺼져 있으면 주기 정보도 불러오지 않는다
  const isVisible = useIsMenstrualPhaseVisible();
  const { cycles, isLoading, isError } = useMenstrualPhase(data[data.length - 1].date, {
    enabled: isFemale && isVisible,
    historyStartDate: data[0].date,
  });
  const plot = usePlotArea();
  const xScale = useXAxisScale();

  if (!isVisible || !isFemale || isLoading || isError || !plot || !xScale) return null;

  const ranges: PhaseRange[] = [];
  data.forEach(({ date }, index) => {
    const context = selectMenstrualCycleContext({ cycles, targetDate: date });
    const phaseDate = context ? calculateMenstrualPhaseDates(context, date) : null;
    const menstrualStatus = getMenstrualTypeFromPhase({
      targetDate: date,
      phaseDate: phaseDate ?? undefined,
    });
    if (!menstrualStatus) return;
    // 기록 없이 예상만 있는 월경 구간도 월경기로 칠한다 (월경 홈 진행 바와 같게)
    const status: PhaseStatus =
      menstrualStatus === "next_predicted" ? "menstrual_recorded" : menstrualStatus;

    const previous = ranges.at(-1);
    if (previous?.status === status && previous.endIndex === index - 1) {
      previous.endIndex = index;
    } else {
      ranges.push({ status, startIndex: index, endIndex: index });
    }
  });

  const getBoundary = (index: number) => {
    if (index === 0) return plot.x;
    if (index === data.length) return plot.x + plot.width;
    const previousX = xScale(data[index - 1].date);
    const currentX = xScale(data[index].date);
    return previousX !== undefined && currentX !== undefined
      ? (previousX + currentX) / 2
      : undefined;
  };

  return (
    <ZIndexLayer zIndex={-1}>
      <g pointerEvents="none">
        {ranges.map(({ status, startIndex, endIndex }) => {
          const left = getBoundary(startIndex);
          const right = getBoundary(endIndex + 1);
          if (left === undefined || right === undefined || right <= left) return null;

          const { label, fill } = PHASE_VIEW[status];
          const width = right - left;

          return (
            <g key={data[startIndex].date}>
              <title>{`${label}: ${data[startIndex].date} ~ ${data[endIndex].date}`}</title>
              <rect x={left} y={plot.y} width={width} height={plot.height} fill={fill} />
              {width > label.length * 12 && (
                <text
                  x={(left + right) / 2}
                  y={plot.y - 4}
                  textAnchor="middle"
                  className="caption-m-medium text-tertiary"
                  fill="currentColor"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </ZIndexLayer>
  );
}
