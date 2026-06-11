export const HOME_ONBOARDING_STORAGE_KEY = "home-onboarding:v1:done";

export type HomeOnboardingTarget = "chat" | "menu-board-camera";

export type HomeOnboardingStep = {
  description: string;
  title: string;
  target: HomeOnboardingTarget;
};

type ResolveHomeOnboardingStepsParams = {
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
};

export function resolveHomeOnboardingSteps({
  showChatCard,
  showMenuBoardCameraCard,
}: ResolveHomeOnboardingStepsParams) {
  const steps: HomeOnboardingStep[] = [];

  if (showMenuBoardCameraCard) {
    steps.push({
      target: "menu-board-camera",
      title: "메뉴판이나 음식을 찍어보세요!",
      description: "메뉴 추천과 피드백을 해드려요",
    });
  }

  if (showChatCard) {
    steps.push({
      target: "chat",
      title: "식단 고민, 무엇이든 물어보세요",
      description: "",
    });
  }

  return steps;
}
