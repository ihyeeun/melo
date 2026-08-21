// response
export interface MenstruationCyclesResponse {
  cycles: CycleItem[];
}

export interface CycleItem {
  cycle_id: number;
  start_date: string;
  end_date: string;
  is_end: boolean;
}

// request
export interface getCyclesRequest {
  date: string;
  limit: number;
}

//
export type CycleType = { type: "CREATE_CYCLE" } | { type: "EXTEND_CYCLE"; cycle_id: number };

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type MenstrualCalculateCalendar = {
  cyclePeriod: number;
  calendar: {
    possibleDate?: DateRange;
    predictedDate?: string;
    menstrualDates: DateRange[];
  };
};

export type MenstrualPhase = "MENSTRUAL" | "FOLLICULAR" | "OVULATORY" | "LUTEAL";
