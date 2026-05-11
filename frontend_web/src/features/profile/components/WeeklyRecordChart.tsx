import { useId } from "react";
import type { TooltipContentProps } from "recharts";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "@/features/profile/components/WeeklyRecordChart.module.css";

type WeeklyRecordChartData = {
  label: string;
  target?: number;
  value: number | null;
};

type WeeklyRecordChartProps = {
  data: WeeklyRecordChartData[];
  unit: string;
  yTicks: number[];
};

type AxisTickProps = {
  index?: number;
  payload?: {
    value: number | string;
  };
  visibleTicksCount?: number;
  x?: number;
  y?: number;
};

type CustomTooltipProps = TooltipContentProps & {
  unit: string;
};

function XAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const rawValue = String(payload?.value ?? "");
  const [dateLabel, statusLabel] = rawValue.includes("\n")
    ? rawValue.split("\n", 2)
    : [rawValue, ""];
  const isTodayTick = statusLabel.trim() === "오늘";
  const tickClassName =
    `${styles.xAxisTick} ${isTodayTick ? styles.xAxisTickToday : ""} typo-caption`.trim();

  return (
    <text className={tickClassName} textAnchor="middle" x={x} y={y + 12}>
      <tspan x={x}>{dateLabel}</tspan>
      {statusLabel ? (
        <tspan x={x} dy="1.2em">
          {statusLabel}
        </tspan>
      ) : null}
    </text>
  );
}

function YAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  return (
    <text className={`${styles.yAxisTick} typo-caption`} textAnchor="end" x={x} y={y}>
      {payload?.value}
    </text>
  );
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const valuePayload = payload.find((entry) => entry.dataKey === "value");
  const first = valuePayload?.value;
  const valueText =
    typeof first === "number" ? `${first.toLocaleString("ko-KR")} ${unit}` : `- ${unit}`;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>{valueText}</p>
    </div>
  );
}

export default function WeeklyRecordChart({ data, unit, yTicks }: WeeklyRecordChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const targetGradientId = `${gradientId}-target`;
  const yMax = yTicks[yTicks.length - 1] ?? 100;
  const hasTarget = data.some((point) => typeof point.target === "number");

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer>
        <AreaChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-current)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--chart-current)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={targetGradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-target)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--chart-target)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--chart-grid)" strokeWidth={1} />

          <XAxis
            axisLine={false}
            dataKey="label"
            height={50}
            minTickGap={0}
            padding="no-gap"
            tick={<XAxisTick />}
            tickLine={false}
            interval={0}
          />

          <YAxis
            allowDecimals={false}
            axisLine={false}
            domain={[0, yMax]}
            tick={<YAxisTick />}
            tickLine={false}
            ticks={yTicks}
            width={35}
          />

          <Tooltip
            content={(props) => <CustomTooltip {...props} unit={unit} />}
            cursor={{ fill: "rgb(0 0 0 / 6%)" }}
            wrapperClassName={styles.tooltipWrapper}
          />

          {hasTarget && (
            <Area
              activeDot={false}
              connectNulls
              dataKey="target"
              dot={false}
              fill={`url(#${targetGradientId})`}
              isAnimationActive={false}
              stroke="var(--chart-target)"
              strokeWidth={1}
              type="linear"
            />
          )}

          <Area
            dataKey="value"
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            stroke="var(--chart-current)"
            strokeWidth={1}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
