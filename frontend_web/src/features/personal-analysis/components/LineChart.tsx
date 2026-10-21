import { eachDayOfInterval, format } from "date-fns";
import { createPortal } from "react-dom";
import {
  type CartesianTickItem,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Text,
  Tooltip,
  useActiveTooltipCoordinate,
  useActiveTooltipDataPoints,
  useYAxisScale,
  useYAxisTicks,
  XAxis,
  YAxis,
} from "recharts";
import { type ActiveDotProps, usePlotArea } from "recharts";

import { MenstrualPhaseBackground } from "@/features/personal-analysis/components/MenstrualPhaseBackground";
import {
  type ChartViewport,
  ZoomableChart,
} from "@/features/personal-analysis/components/ZoomableChart";
import styles from "@/features/personal-analysis/styles/LineChart.module.css";
import type { RecentAnalysisMode } from "@/shared/api/types/api.request.dto";
import type { RecentAnalysisResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

interface chartProps<M extends RecentAnalysisMode> {
  chartData: RecentAnalysisResponseDto[M][];
  valueKey: string;
}

const Y_AXIS_TICK_GAP = 8;
const formatYAxisTick = (value: number) => String(Number(value.toFixed(1)));

export function LineChart<M extends RecentAnalysisMode>({ chartData, valueKey }: chartProps<M>) {
  if (chartData.length === 0) return <EmptyChartPreview />;

  const dataByDate = new Map(chartData.map((item) => [item.date, item]));

  const days = eachDayOfInterval({
    start: parseDateKey(chartData[0].date),
    end: parseDateKey(chartData[chartData.length - 1].date),
  });

  const dailyData = days.map((day, dayIndex) => {
    const date = formatDateKey(day);

    const record = dataByDate.get(date) ?? { date, [valueKey]: null };

    return {
      ...record,
      dayIndex,
    };
  });

  return (
    <ZoomableChart
      key={`${valueKey}:${dailyData[0].date}:${dailyData[dailyData.length - 1].date}`}
      dayCount={dailyData.length}
    >
      {(viewport) => (
        <ResponsiveContainer width="100%" height="100%" className={styles.chartSection}>
          <RechartsLineChart data={dailyData}>
            <MenstrualPhaseBackground data={dailyData} />
            <XAxis
              dataKey="date"
              ticks={dailyData
                .filter((_, index) => index % Math.max(1, Math.ceil(7 / viewport.zoom)) === 0)
                .map((item) => item.date)}
              interval={0}
              tickFormatter={(date: string) => format(parseDateKey(date), "M.d")}
              tick={{
                className: "caption-s-medium",
                fill: "var(--text-tertiary)",
              }}
              axisLine={{ stroke: "var(--coral-900)", strokeWidth: "1" }}
              tickLine={false}
              height={"auto"}
              padding={{ left: 12, right: 12 }}
            />

            <YAxis
              domain={["auto", "auto"]}
              reversed={valueKey === "calorie_deficit"}
              tickFormatter={formatYAxisTick}
              tick={{
                className: "caption-s-medium",
                fill: "var(--text-tertiary)",
                opacity: viewport.overlayPortal ? 0 : 1,
              }}
              axisLine={false}
              tickLine={false}
              tickSize={0}
              tickMargin={Y_AXIS_TICK_GAP}
              tickCount={5}
              width={"auto"}
              padding={{ top: 12, bottom: 12 }}
            />

            <FixedYAxis portal={viewport.overlayPortal} />
            <PointTooltip valueKey={valueKey} viewport={viewport} />

            <Line
              type="linear"
              dataKey={valueKey}
              connectNulls
              strokeWidth={1}
              stroke="var(--coral-300)"
              dot={{ r: 2, fill: "var(--coral-500)", stroke: "none" }}
              activeDot={(props) => <ActivePoint {...props} />}
              isAnimationActive={false}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      )}
    </ZoomableChart>
  );
}

function FixedYAxis({ portal }: { portal: HTMLDivElement | null }) {
  const plot = usePlotArea();
  const ticks = useYAxisTicks();

  if (!portal || !plot || !ticks) return null;

  return createPortal(
    <svg className={styles.fixedYAxis} width={plot.x} height="100%" aria-hidden="true">
      {ticks.map(({ value, coordinate, tickCoord }: CartesianTickItem) => (
        <Text
          key={value}
          x={plot.x - Y_AXIS_TICK_GAP}
          y={tickCoord ?? coordinate}
          textAnchor="end"
          verticalAnchor="middle"
          className="caption-s-medium"
          fill="var(--text-tertiary)"
        >
          {formatYAxisTick(value)}
        </Text>
      ))}
    </svg>,
    portal,
  );
}

function PointTooltip({ valueKey, viewport }: { valueKey: string; viewport: ChartViewport }) {
  const coordinate = useActiveTooltipCoordinate();
  const [point] = useActiveTooltipDataPoints<Record<string, unknown>>() ?? [];
  const yScale = useYAxisScale();
  const plot = usePlotArea();
  const value = point?.[valueKey];
  const x = coordinate ? coordinate.x - viewport.scrollLeft : undefined;
  const y = typeof value === "number" ? yScale?.(value) : undefined;

  return (
    <Tooltip
      portal={viewport.overlayPortal}
      wrapperStyle={{
        position: "absolute",
        top: 0,
        left: 0,
        transform: `translate(${x ?? 0}px, ${y ?? 0}px)`,
        pointerEvents: "none",
        zIndex: 2,
      }}
      isAnimationActive={false}
      content={({ active }) => {
        if (!active || typeof value !== "number" || x === undefined || y === undefined) return null;
        if (x < (plot?.x ?? 0) || x > viewport.width) return null;

        const unit = valueKey === "weight" ? "kg" : "kcal";
        const displayLabel = `${value} ${unit}`;

        return <div className={`caption-m-medium ${styles.tooltip}`}>{displayLabel}</div>;
      }}
      cursor={false}
    />
  );
}

function ActivePoint({ cx, cy }: ActiveDotProps) {
  const plot = usePlotArea();

  if (!plot || typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  const bottom = plot.y + plot.height;

  return (
    <g pointerEvents="none">
      {cy < bottom && (
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={bottom}
          stroke="var(--navy-700)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}

      <circle cx={cx} cy={cy} r={4} fill="var(--navy-700)" />
    </g>
  );
}

const EMPTY_CHART_DATA = [
  -150, -150, -150, -150, -150, -150, -150, -150, -150, -180, -170, -210, -180, -210, -240, -270,
  -310, -280, -320, -370, -520, -440, -370, -340, -370, -240, -150, -70, -20, 70,
].map((value, index) => ({
  index,
  value,
}));

const PREVIEW_LABELS: Record<number, string> = {
  0: "8.18",
  7: "8.25",
  14: "9.1",
  21: "9.8",
  28: "9.15",
};

function EmptyChartPreview() {
  return (
    <div aria-hidden="true" style={{ height: "100%", pointerEvents: "none" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={EMPTY_CHART_DATA} accessibilityLayer={false}>
          <XAxis
            type="number"
            dataKey="index"
            domain={[0, 29]}
            ticks={[0, 7, 14, 21, 28]}
            interval={0}
            tickFormatter={(index: number) => PREVIEW_LABELS[index] ?? ""}
            tick={{
              className: "caption-s-medium",
              fill: "var(--text-tertiary)",
            }}
            tickLine={false}
            axisLine={{ stroke: "var(--coral-900)" }}
            height="auto"
          />

          <YAxis
            domain={[-750, 250]}
            ticks={[-750, -500, -250, 0, 250]}
            reversed
            tick={{
              className: "caption-s-medium",
              fill: "var(--text-tertiary)",
            }}
            tickLine={false}
            axisLine={false}
            width="auto"
          />

          <Line
            type="linear"
            dataKey="value"
            stroke="var(--coral-300)"
            strokeWidth={1}
            dot={{
              r: 2,
              fill: "var(--coral-500)",
              stroke: "none",
            }}
            activeDot={false}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
