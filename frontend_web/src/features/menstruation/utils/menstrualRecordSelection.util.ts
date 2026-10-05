import { addDays } from "date-fns";

import { mergeMenstrualRanges } from "@/features/menstruation/utils/menstrualCycleRecords.util";
import type {
  MenstrualDateRangeRequestDto,
  SaveMenstrualRecordsRequestDto,
} from "@/shared/api/types/api.request.dto";
import type { MenstrualDateRangeResponseDto } from "@/shared/api/types/api.response.dto";
import { formatDateKey, parseDateKey } from "@/shared/utils/dateFormat";

type DateSelection = {
  initialRecorded: boolean;
  selected: boolean;
};

export type MenstrualDateSelections = Record<string, DateSelection>;

export function isMenstrualDateSelected(
  selections: MenstrualDateSelections,
  dateKey: string,
  isRecorded: boolean,
) {
  return selections[dateKey]?.selected ?? isRecorded;
}

export function toggleMenstrualDate(
  selections: MenstrualDateSelections,
  dateKey: string,
  isRecorded: boolean,
): MenstrualDateSelections {
  const previous = selections[dateKey];

  return {
    ...selections,
    [dateKey]: {
      // 편집을 시작한 시점의 기록 여부는 재조회로 덮어쓰지 않는다.
      initialRecorded: previous?.initialRecorded ?? isRecorded,
      selected: !(previous?.selected ?? isRecorded),
    },
  };
}

function shiftDateKey(dateKey: string, days: number) {
  return formatDateKey(addDays(parseDateKey(dateKey), days));
}

function rangeKey(range: MenstrualDateRangeRequestDto) {
  return `${range.start_date}/${range.end_date}`;
}

function groupConsecutiveDates(dateKeys: string[]) {
  return mergeMenstrualRanges(dateKeys.map((dateKey) => ({ start_date: dateKey, end_date: dateKey })));
}

function subtractRanges(
  ranges: MenstrualDateRangeRequestDto[],
  removals: MenstrualDateRangeRequestDto[],
) {
  let remaining = ranges;

  for (const removal of removals) {
    remaining = remaining.flatMap((range) => {
      if (removal.end_date < range.start_date || range.end_date < removal.start_date) {
        return [range];
      }

      const parts: MenstrualDateRangeRequestDto[] = [];
      if (range.start_date < removal.start_date) {
        parts.push({ start_date: range.start_date, end_date: shiftDateKey(removal.start_date, -1) });
      }
      if (removal.end_date < range.end_date) {
        parts.push({ start_date: shiftDateKey(removal.end_date, 1), end_date: range.end_date });
      }
      return parts;
    });
  }

  return remaining;
}

export function buildMenstrualRecordsUpdate(
  selections: MenstrualDateSelections,
  recordedRanges: readonly MenstrualDateRangeResponseDto[],
): SaveMenstrualRecordsRequestDto {
  const addedDates: string[] = [];
  const removedDates: string[] = [];

  for (const [dateKey, { initialRecorded, selected }] of Object.entries(selections)) {
    if (initialRecorded === selected) continue;

    if (selected) {
      addedDates.push(dateKey);
    } else {
      removedDates.push(dateKey);
    }
  }

  if (addedDates.length === 0 && removedDates.length === 0) {
    return { add_ranges: [], remove_ranges: [] };
  }

  // 월을 걸쳐 중복 조회된 원본 기간은 한 번만 삭제한다.
  const originals = [...new Map(recordedRanges.map((range) => [rangeKey(range), range])).values()];
  const before = mergeMenstrualRanges(originals);
  const after = subtractRanges(
    mergeMenstrualRanges([
      ...before,
      ...addedDates.map((dateKey) => ({ start_date: dateKey, end_date: dateKey })),
    ]),
    groupConsecutiveDates(removedDates),
  );
  const beforeKeys = new Set(before.map(rangeKey));
  const afterKeys = new Set(after.map(rangeKey));
  const replacedRanges = before.filter((range) => !afterKeys.has(rangeKey(range)));

  return {
    add_ranges: after.filter((range) => !beforeKeys.has(rangeKey(range))),
    // 변경된 기간의 원본 전체를 삭제하고, 병합·분할한 최종 기간을 같은 요청으로 추가한다.
    // 서버는 remove_ranges를 먼저 적용한 뒤 add_ranges를 적용해야 한다.
    remove_ranges: originals
      .filter((original) =>
        replacedRanges.some(
          (range) => original.start_date <= range.end_date && range.start_date <= original.end_date,
        ),
      )
      .map((range) => ({ ...range }))
      .sort((left, right) =>
        left.start_date.localeCompare(right.start_date) || left.end_date.localeCompare(right.end_date),
      ),
  };
}
