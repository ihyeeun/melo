import { usePlotArea, useXAxisScale, ZIndexLayer } from "recharts";

import { useMenstrualPhase } from "@/features/menstruation/hooks/useMenstrualPhase";
import type { MenstrualStatus } from "@/features/menstruation/types/menstruation.type";
import { selectMenstrualCycleContext } from "@/features/menstruation/utils/menstrualCycleContext.util";
import {
  calculateMenstrualPhaseDates,
  getMenstrualTypeFromPhase,
} from "@/features/menstruation/utils/menstrualPhaseDatesCalculation.util";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";

const PHASE_VIEW = {
  menstrual_recorded: { label: "월경기", fill: "var(--coral-200)" },
  follicular: { label: "난포기", fill: "var(--coral-100)" },
  ovulatory: { label: "배란기", fill: "var(--coral-50)" },
  luteal: { label: "황체기", fill: "var(--coral-100)" },
  next_predicted: { label: "월경 예상", fill: "var(--coral-200)" },
} satisfies Record<NonNullable<MenstrualStatus>, { label: string; fill: string }>;

type PhaseRange = {
  status: NonNullable<MenstrualStatus>;
  startIndex: number;
  endIndex: number;
};

export function MenstrualPhaseBackground({ data }: { data: readonly { date: string }[] }) {
  const { data: profile } = useGetProfileQuery();
  const isFemale = profile?.gender === 1;
  const { cycles, isLoading, isError } = useMenstrualPhase(data[data.length - 1].date, {
    enabled: isFemale,
    historyStartDate: data[0].date,
  });
  const plot = usePlotArea();
  const xScale = useXAxisScale();

  if (!isFemale || isLoading || isError || !plot || !xScale) return null;

  const ranges: PhaseRange[] = [];
  data.forEach(({ date }, index) => {
    const context = selectMenstrualCycleContext({ cycles, targetDate: date });
    const phaseDate = context ? calculateMenstrualPhaseDates(context, date) : null;
    const status = getMenstrualTypeFromPhase({
      targetDate: date,
      phaseDate: phaseDate ?? undefined,
    });
    if (!status) return;

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
                  y={plot.y + 16}
                  textAnchor="middle"
                  className="caption-m-medium text-secondary"
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
