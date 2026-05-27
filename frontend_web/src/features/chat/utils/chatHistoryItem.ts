import type { ChatHistoryItemResponseDto } from "@/shared/api/types/api.dto";

export function isChatHistoryItemResponse(value: unknown): value is ChatHistoryItemResponseDto {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<ChatHistoryItemResponseDto>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.input_text === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.response_payload === "object" &&
    candidate.response_payload !== null
  );
}
