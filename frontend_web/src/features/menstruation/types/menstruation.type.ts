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
