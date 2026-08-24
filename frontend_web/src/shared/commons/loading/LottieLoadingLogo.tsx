import type { ComponentProps } from "react";

import mellowLogoLoadingAnimationUrl from "./assets/mellow_logo_loading.json?url";
import { LottieLoadingAnimation } from "./LottieLoadingAnimation";

type LottieLoadingLogoProps = Omit<ComponentProps<typeof LottieLoadingAnimation>, "animationUrl">;

export function LottieLoadingLogo({ speed = 1.25, ...props }: LottieLoadingLogoProps) {
  return (
    <LottieLoadingAnimation
      {...props}
      animationUrl={mellowLogoLoadingAnimationUrl}
      speed={speed}
    />
  );
}
