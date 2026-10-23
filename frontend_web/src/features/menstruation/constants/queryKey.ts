import type { GetMenstrualRecordsRequestDto } from "@/shared/api/types/api.request.dto";

export const menstrualKeys = {
  all: ["menstrual"] as const,

  records: {
    all: () => [...menstrualKeys.all, "records"] as const,
    year: (range: GetMenstrualRecordsRequestDto) =>
      [...menstrualKeys.records.all(), "year", range] as const,
    phaseHistory: (initialRange: GetMenstrualRecordsRequestDto) =>
      [...menstrualKeys.records.all(), "phase_history", initialRange] as const,
  },
};
