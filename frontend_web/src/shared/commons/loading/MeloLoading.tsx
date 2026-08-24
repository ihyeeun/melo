import type { ComponentProps } from "react";

import meloLoadingAnimationUrl from "./assets/melo-loading.json?url";
import { LottieLoadingAnimation } from "./LottieLoadingAnimation";

type MeloLoadingProps = Omit<ComponentProps<typeof LottieLoadingAnimation>, "animationUrl">;

export function MeloLoading(props: MeloLoadingProps) {
  return <LottieLoadingAnimation {...props} animationUrl={meloLoadingAnimationUrl} />;
}
