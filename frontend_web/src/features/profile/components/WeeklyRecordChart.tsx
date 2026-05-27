import { useId, useMemo } from "react";
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
  domainMode?: "fit" | "zero";
  targetLabel?: string;
  unit: string;
  valueLabel: string;
  yTicks?: number[];
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
  targetLabel?: string;
  unit: string;
  valueLabel: string;
};

const DEFAULT_Y_TICKS = [0, 25, 50, 75, 100];
const TARGET_TICK_COUNT = 5;
const ACTIVE_DOT_RADIUS = 3;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getNiceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const normalized = rawStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;

  return 10 * magnitude;
}

function roundTick(value: number) {
  if (Math.abs(value) < Number.EPSILON) {
    return 0;
  }

  return Number(value.toFixed(6));
}

function getDynamicYTicks(data: WeeklyRecordChartData[], domainMode: "fit" | "zero") {
  const values = data.flatMap((point) => [point.value, point.target]).filter(isFiniteNumber);

  if (values.length === 0) {
    return DEFAULT_Y_TICKS;
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const dataRange = dataMax - dataMin;
  const startAtZero = domainMode === "zero";
  const padding = dataRange === 0 ? Math.max(Math.abs(dataMax) * 0.04, 1) : dataRange * 0.1;
  const paddedMin = startAtZero ? 0 : Math.max(0, dataMin - padding);
  const paddedMax = dataMax + padding;
  const step = getNiceStep((paddedMax - paddedMin) / (TARGET_TICK_COUNT - 1));
  const tickMin = startAtZero ? 0 : Math.max(0, Math.floor(paddedMin / step) * step);
  const tickMax = Math.ceil(paddedMax / step) * step;
  const ticks: number[] = [];

  for (let tick = tickMin; tick <= tickMax + step * 0.5; tick += step) {
    ticks.push(roundTick(tick));
  }

  return ticks.length >= 2 ? ticks : DEFAULT_Y_TICKS;
}

function formatAxisTick(value: number | string | undefined) {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    return value;
  }

  return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(1);
}

function formatTooltipValue(value: unknown, unit: string) {
  return typeof value === "number" ? `${value.toLocaleString("ko-KR")} ${unit}` : `- ${unit}`;
}

function XAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const rawValue = String(payload?.value ?? "");
  const [dateLabel, statusLabel] = rawValue.includes("\n")
    ? rawValue.split("\n", 2)
    : [rawValue, ""];
  const isTodayTick = statusLabel.trim() === "오늘";
  const tickClassName =
    `${styles.xAxisTick} ${isTodayTick ? styles.xAxisTickToday : ""} typo-caption4`.trim();

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
    <text className={`${styles.yAxisTick} typo-caption4`} textAnchor="end" x={x} y={y}>
      {formatAxisTick(payload?.value)}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
  targetLabel,
  unit,
  valueLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const tooltipRows = [
    { dataKey: "value", label: valueLabel },
    { dataKey: "target", label: targetLabel },
  ].flatMap(({ dataKey, label: rowLabel }) => {
    if (!rowLabel) return [];

    const entry = payload.find((payloadEntry) => String(payloadEntry.dataKey) === dataKey);
    if (!entry) return [];

    return [
      {
        dataKey,
        label: rowLabel,
        value: formatTooltipValue(entry.value, unit),
      },
    ];
  });

  if (tooltipRows.length === 0) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <div className={styles.tooltipRows}>
        {tooltipRows.map((row) => (
          <div key={row.dataKey} className={styles.tooltipRow}>
            <span className={styles.tooltipRowLabel}>{row.label}</span>
            <span
              className={`${styles.tooltipRowValue} ${
                row.dataKey === "target"
                  ? styles.tooltipRowValueTarget
                  : styles.tooltipRowValueCurrent
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyRecordChart({
  data,
  domainMode = "zero",
  targetLabel,
  unit,
  valueLabel,
  yTicks: fixedYTicks,
}: WeeklyRecordChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const targetGradientId = `${gradientId}-target`;
  const yTicks = useMemo(
    () => fixedYTicks ?? getDynamicYTicks(data, domainMode),
    [data, domainMode, fixedYTicks],
  );
  const yMin = yTicks[0] ?? 0;
  const yMax = yTicks[yTicks.length - 1] ?? 100;
  const allowDecimals = yTicks.some((tick) => !Number.isInteger(tick));
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
              {/* <stop offset="0%" stopColor="var(--chart-target)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--chart-target)" stopOpacity={0} /> */}
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
            allowDecimals={allowDecimals}
            axisLine={false}
            domain={[yMin, yMax]}
            tick={<YAxisTick />}
            tickLine={false}
            ticks={yTicks}
            width={35}
          />

          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                targetLabel={targetLabel}
                unit={unit}
                valueLabel={valueLabel}
              />
            )}
            cursor={false}
            shared
            wrapperClassName={styles.tooltipWrapper}
          />

          {hasTarget && (
            <Area
              activeDot={{
                fill: "var(--chart-target)",
                r: ACTIVE_DOT_RADIUS,
                stroke: "var(--bg-white)",
                strokeWidth: 1,
              }}
              connectNulls
              dataKey="target"
              dot={false}
              fill={`url(#${targetGradientId})`}
              isAnimationActive={false}
              name={targetLabel}
              stroke="var(--chart-target)"
              strokeWidth={1}
              type="monotone"
            />
          )}

          <Area
            activeDot={{
              fill: "var(--chart-current)",
              r: ACTIVE_DOT_RADIUS,
              stroke: "var(--bg-white)",
              strokeWidth: 1,
            }}
            dataKey="value"
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            name={valueLabel}
            stroke="var(--chart-current)"
            strokeWidth={1}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
