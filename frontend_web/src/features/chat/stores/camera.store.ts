import { create } from "zustand";
import { combine } from "zustand/middleware";

import type { ChatGalleryMode, ChatImageSource } from "@/features/chat/types/camera.type";
import type { CameraCaptureResponsePayload } from "@/shared/api/bridge/nativeBridge.types";

interface ChatCameraState {
  capture: {
    id: number;
    image: CameraCaptureResponsePayload;
    source: ChatImageSource;
  } | null;
  nextId: number;
}

const initState: ChatCameraState = {
  capture: null,
  nextId: 1,
};

const useChatCameraStore = create(
  combine(initState, (set, get) => ({
    setCapture: ({
      image,
      mode,
      source,
    }: {
      image: CameraCaptureResponsePayload;
      mode?: ChatGalleryMode;
      source: ChatImageSource;
    }) => {
      set((state) => ({
        capture: {
          id: state.nextId,
          image: {
            ...image,
            mode: mode ?? image.mode,
          },
          source,
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
