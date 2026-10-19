import { eachDayOfInterval } from "date-fns";
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type ActiveDotProps, usePlotArea } from "recharts";

import styles from "@/features/personal-analysis/styles/LineChart.module.css";
import type { RecentAnalysisMode } from "@/shared/api/types/api.request.dto";
import type { RecentAnalysisResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

interface chartProps<M extends RecentAnalysisMode> {
  chartData: RecentAnalysisResponseDto[M][];
  valueKey: string;
}

export function LineChart<M extends RecentAnalysisMode>({ chartData, valueKey }: chartProps<M>) {
  if (chartData.length === 0) return <p>아직 기록이 없어요.</p>;

  const dataByDate = new Map(chartData.map((item) => [item.date, item]));

  const days = eachDayOfInterval({
    start: parseDateKey(chartData[0].date),
    end: parseDateKey(chartData[chartData.length - 1].date),
  });

  const dailyData = days.map((day) => {
    const date = formatDateKey(day);

    return dataByDate.get(date) ?? { date, [valueKey]: null };
  });

  const ticks = dailyData.filter((_, index) => index % 7 === 0).map((item) => item.date);

  return (
    <ResponsiveContainer width="100%" height="100%" className={styles.chartSection}>
      <RechartsLineChart data={dailyData}>
        <XAxis
          dataKey="date"
          ticks={ticks}
          interval={0}
          tickFormatter={(date: string) => date.slice(5).replace("-", ".")}
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
          tickFormatter={(value: number) => String(Number(value.toFixed(1)))}
          tick={{
            className: "caption-s-medium",
            fill: "var(--text-tertiary)",
          }}
          axisLine={false}
          tickLine={false}
          tickCount={5}
          width={"auto"}
          padding={{ top: 12, bottom: 12 }}
        />

        <Tooltip
          content={({ active, payload }) => {
            if (!active) return;

            const value = payload.find((item) => item.dataKey === valueKey)?.value ?? 0;
            const unit = valueKey === "weight" ? "kg" : "kcal";
            const displayLabel = `${value} ${unit}`;

            return <div className={`caption-m-medium ${styles.tooltip}`}>{displayLabel}</div>;
          }}
          cursor={false}
        />

        <Line
          type="linear"
          dataKey={valueKey}
          connectNulls
          strokeWidth={1}
          stroke="var(--coral-300)"
          dot={{ r: 2, fill: "var(--coral-500)", stroke: "none" }}
          activeDot={(props) => <ActivePoint {...props} />}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
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
