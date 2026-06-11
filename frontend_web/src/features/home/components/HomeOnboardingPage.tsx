import { useMemo, useState } from "react";

import HomeContent from "@/features/home/components/HomeContent";
import HomeOnboardingOverlay, {
  HomeOnboardingBubble,
} from "@/features/home/components/HomeOnboardingOverlay";
import MenuActionSection from "@/features/home/components/MenuActionSection";
import { PreviewTodayScorePreview } from "@/features/home/components/PreviewTodayScoreSection";
import { TodayBodyLogPreviewSection } from "@/features/home/components/TodayBodyLogSection";
import { resolveHomeOnboardingSteps } from "@/features/home/constants/homeOnboarding";

type HomeOnboardingPageProps = {
  onFinish: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
  selectedDateKey: string;
  showChatCard: boolean;
  showMenuBoardCameraCard: boolean;
};

export default function HomeOnboardingPage({
  onFinish,
  onSelectDate,
  selectedDate,
  selectedDateKey,
  showChatCard,
  showMenuBoardCameraCard,
}: HomeOnboardingPageProps) {
  const onboardingSteps = useMemo(
    () => resolveHomeOnboardingSteps({ showChatCard, showMenuBoardCameraCard }),
    [showChatCard, showMenuBoardCameraCard],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = onboardingSteps[stepIndex] ?? null;

  const handleAdvanceStepOrFinish = () => {
    if (stepIndex >= onboardingSteps.length - 1) {
      onFinish();
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, onboardingSteps.length - 1));
  };

  if (!currentStep) return null;

  return (
    <>
      <HomeContent
        selectedDate={selectedDate}
        selectedDateKey={selectedDateKey}
        onSelectDate={onSelectDate}
        showMenuBoardCameraCard={showMenuBoardCameraCard}
        showChatCard={showChatCard}
        scoreSection={<PreviewTodayScorePreview />}
        menuActionSection={
          <MenuActionSection
            selectedDate={selectedDateKey}
            showMenuBoardCameraCard={showMenuBoardCameraCard}
            showChatCard={showChatCard}
            disableInteractions
            activeOnboardingTarget={currentStep.target}
            renderOnboardingBubble={(target) =>
              target === currentStep.target ? (
                <HomeOnboardingBubble
                  step={currentStep}
                  stepIndex={stepIndex}
                  totalSteps={onboardingSteps.length}
                  onAdvance={handleAdvanceStepOrFinish}
                />
              ) : null
            }
            bodyLogSection={<TodayBodyLogPreviewSection />}
          />
        }
      />
      <HomeOnboardingOverlay onAdvance={handleAdvanceStepOrFinish} />
    </>
  );
}
