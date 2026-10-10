import { create } from "zustand";
import { combine } from "zustand/middleware";

import type { CameraCaptureResponsePayload } from "@/shared/api/bridge/nativeBridge.types";

interface ChatCameraState {
  capture: {
    id: number;
    image: CameraCaptureResponsePayload;
  } | null;
  nextId: number;
}

const initState: ChatCameraState = {
  capture: null,
  nextId: 1,
};

const useChatCameraStore = create(
  combine(initState, (set, get) => ({
    setCapture: (image: CameraCaptureResponsePayload) => {
      set((state) => ({
        capture: {
          id: state.nextId,
          image,
        },
        nextId: state.nextId + 1,
      }));
    },
    clearCapture: (id: number) => {
      if (get().capture?.id !== id) return;

      set({ capture: null });
    },
  })),
);

export const useSetImage = () => {
  return useChatCameraStore((store) => store.setCapture);
};

export const useClearImage = () => {
  return useChatCameraStore((store) => store.clearCapture);
};

export const useGetImage = () => {
  return useChatCameraStore((store) => store.capture);
};
