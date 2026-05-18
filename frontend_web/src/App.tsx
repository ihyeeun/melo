import "./App.css";

import { useEffect } from "react";

import { initNativeBridgeListener } from "@/shared/api/bridge/nativeBridge";
import { syncFeatureGuardStateToApp } from "@/shared/guards/featureGuard";
import { StackflowRuntime } from "@/shared/navigation/StackflowRuntime";
import { initContentInteractionGuard } from "@/shared/utils/contentInteractionGuard";
import { initInputCharacterRestriction } from "@/shared/utils/inputCharacterRestriction";

export default function App() {
  useEffect(() => {
    const cleanupNativeBridgeListener = initNativeBridgeListener();
    const cleanupContentInteractionGuard = initContentInteractionGuard();
    const cleanupInputCharacterRestriction = initInputCharacterRestriction();
    syncFeatureGuardStateToApp();

    return () => {
      cleanupInputCharacterRestriction();
      cleanupContentInteractionGuard();
      cleanupNativeBridgeListener();
    };
  }, []);

  return (
    <div className="app-container">
      <StackflowRuntime />
    </div>
  );
}
