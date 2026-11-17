import type { MODE } from "@/features/camera/constants/camera.constant";

export type ChatGalleryMode = typeof MODE.FOOD | typeof MODE.NUTRITION;

// 채팅 사진을 어디서 가져왔는지. 분석 실패 안내 문구가 달라진다(다시 촬영 / 다시 고르기)
export type ChatImageSource = "camera" | "gallery";
