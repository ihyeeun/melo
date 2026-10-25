import { useEffect, useId, useRef, useState } from "react";

import { WATER_GLASS_CAPACITY_ML } from "@/features/water-intake/constants/waterIntakeRange.constant";
import styles from "@/features/water-intake/styles/WaterIntakeGlass.module.css";

type WaterFrame = {
  level: number;
  phase: number;
  amplitude: number;
};

const WIDTH = 260;
const WATER_TOP = 28;
const WATER_BOTTOM = 322;

// 수위 이동과 물결이 잦아드는 시간을 따로 조절해요.
const FILL_DURATION_MS = 800;
const WAVE_DURATION_MS = 1800;
const WAVE_ATTACK_TIME_MS = 95; // 작을수록 물결이 빠르게 커져요.
const WAVE_DECAY_EXPONENT = 1.5; // 클수록 물결의 세기와 속도가 초반에 빨리 줄어요.

// 높이는 SVG 좌표 단위, 속도는 밀리초당 위상 변화량(rad/ms)이에요.
const WAVE_SPEED = 0.008;
const WAVE_STRENGTH = 12;
const RESTING_WAVE_HEIGHT = 2.5;
const MAX_WAVE_DEPTH_RATIO = 0.45; // 얕은 물에서는 물 깊이에 비례해 파도를 제한해요.
const WAVE_SEGMENT_COUNT = 10;

// 앞쪽 물결을 조금 낮고 잔잔하게, 다른 속도로 움직여 두 층이 겹쳐 보이게 해요.
const FRONT_WAVE_LEVEL_OFFSET = 2;
const FRONT_WAVE_HEIGHT_RATIO = 0.75;
const FRONT_WAVE_SPEED_RATIO = 1.12;

const GLASS_OUTLINE =
  "M 35 7 H 225 C 240 7 251 19 249 35 L 225 308 C 223 323 213 332 198 332 H 62 C 47 332 37 323 35 308 L 11 35 C 9 19 20 7 35 7 Z";
const GLASS_INTERIOR =
  "M 35 17 H 225 Q 241 17 239 34 L 215 307 Q 213 322 198 322 H 62 Q 47 322 45 307 L 21 34 Q 19 17 35 17 Z";

function getWaterLevel(amountMl: number) {
  const fillRatio = Math.min(1, Math.max(0, amountMl / WATER_GLASS_CAPACITY_ML));
  return WATER_BOTTOM - fillRatio * (WATER_BOTTOM - WATER_TOP);
}

function getWavePath({ level, phase, amplitude }: WaterFrame, isFront = false) {
  const surface = level + (isFront ? FRONT_WAVE_LEVEL_OFFSET : 0);
  // 아주 적은 양에서는 파도가 컵 바닥 아래로 내려가지 않도록 줄여요.
  const height = Math.min(
    RESTING_WAVE_HEIGHT + amplitude,
    Math.max(0, WATER_BOTTOM - surface) * MAX_WAVE_DEPTH_RATIO,
  );
  const waveHeight = height * (isFront ? FRONT_WAVE_HEIGHT_RATIO : 1);
  const wavePhase = isFront ? -phase * FRONT_WAVE_SPEED_RATIO + Math.PI : phase;
  const frequency = (Math.PI * 2) / WIDTH;
  const y = (x: number) => surface + Math.sin(x * frequency + wavePhase) * waveHeight;
  const slope = (x: number) => Math.cos(x * frequency + wavePhase) * waveHeight * frequency;
  const segmentWidth = WIDTH / WAVE_SEGMENT_COUNT;
  let path = `M 0 ${y(0)}`;

  for (let x = 0; x < WIDTH; x += segmentWidth) {
    const nextX = x + segmentWidth;
    const controlOffset = segmentWidth / 3;
    path += ` C ${x + controlOffset} ${y(x) + slope(x) * controlOffset} ${nextX - controlOffset} ${y(nextX) - slope(nextX) * controlOffset} ${nextX} ${y(nextX)}`;
  }

  return `${path} L ${WIDTH} 340 L 0 340 Z`;
}

export default function WaterIntakeGlass({ amountMl }: { amountMl: number }) {
  const id = useId();
  const backWaveRef = useRef<SVGPathElement>(null);
  const frontWaveRef = useRef<SVGPathElement>(null);
  const previousAmountRef = useRef(amountMl);
  const [initialFrame] = useState<WaterFrame>(() => ({
    level: getWaterLevel(amountMl),
    phase: 0,
    amplitude: 0,
  }));
  const frameRef = useRef(initialFrame);

  useEffect(() => {
    // 최초 표시나 다른 UI의 리렌더에서는 물결을 시작하지 않아요.
    if (previousAmountRef.current === amountMl) return;
    previousAmountRef.current = amountMl;

    const targetLevel = getWaterLevel(amountMl);
    const startFrame = { ...frameRef.current };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrameId = 0;
    const startedAt = performance.now();
    let previousTime = startedAt;

    const draw = (frame: WaterFrame) => {
      frameRef.current = frame;
      backWaveRef.current?.setAttribute("d", getWavePath(frame));
      frontWaveRef.current?.setAttribute("d", getWavePath(frame, true));
    };

    const settle = () => {
      cancelAnimationFrame(animationFrameId);
      draw({ level: targetLevel, phase: frameRef.current.phase, amplitude: 0 });
    };

    if (reducedMotion.matches) {
      settle();
      return;
    }

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / WAVE_DURATION_MS);
      const fillProgress = Math.min(1, elapsed / FILL_DURATION_MS);
      const fillEase = 1 - (1 - fillProgress) ** 3;
      const decay = (1 - progress) ** WAVE_DECAY_EXPONENT;
      const attack = 1 - Math.exp(-elapsed / WAVE_ATTACK_TIME_MS);

      draw({
        level: startFrame.level + (targetLevel - startFrame.level) * fillEase,
        phase: frameRef.current.phase + (now - previousTime) * WAVE_SPEED * decay,
        amplitude: (startFrame.amplitude + (WAVE_STRENGTH - startFrame.amplitude) * attack) * decay,
      });
      previousTime = now;

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    const handleMotionChange = () => {
      if (reducedMotion.matches) settle();
    };

    animationFrameId = requestAnimationFrame(animate);
    reducedMotion.addEventListener("change", handleMotionChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [amountMl]);

  return (
    <div className={styles.root} aria-hidden="true">
      <svg className={styles.glass} viewBox="0 0 260 340" fill="none" focusable="false">
        <defs>
          {/* 컵 경로에 직접 그림자를 적용하고, 필터 영역에 여유를 둬 잘림을 방지해요. */}
          <filter
            id={`${id}-shadow`}
            filterUnits="userSpaceOnUse"
            x="-12"
            y="-12"
            width="284"
            height="364"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.1" />
          </filter>
          <clipPath id={`${id}-interior`}>
            <path d={GLASS_INTERIOR} />
          </clipPath>
          <linearGradient
            id={`${id}-back`}
            x1="0"
            y1={WATER_TOP}
            x2="0"
            y2={WATER_BOTTOM}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#E4EEF9" stopOpacity="1" />
            <stop offset="1" stopColor="#E9EDF5" stopOpacity="1" />
          </linearGradient>
          <linearGradient
            id={`${id}-front`}
            x1="0"
            y1={WATER_TOP}
            x2="0"
            y2={WATER_BOTTOM}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#E4EEF9" stopOpacity="1" />
            <stop offset="1" stopColor="#E9EDF5" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path className={styles.outline} d={GLASS_OUTLINE} filter={`url(#${id}-shadow)`} />
        <g className={styles.water} clipPath={`url(#${id}-interior)`}>
          <path ref={backWaveRef} d={getWavePath(initialFrame)} fill={`url(#${id}-back)`} />
          <path
            ref={frontWaveRef}
            className={styles.frontWave}
            d={getWavePath(initialFrame, true)}
            fill={`url(#${id}-front)`}
          />
        </g>
      </svg>
    </div>
  );
}
