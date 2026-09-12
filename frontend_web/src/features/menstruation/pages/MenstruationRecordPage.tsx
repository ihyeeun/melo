import { useCallback, useRef, useState } from "react";

import MenstruationCalendar from "@/features/calendar/components/menstruation/MenstruationCalendar";
import { usePastCalendarMonths } from "@/features/calendar/hooks/usePastCalendarMonths";
import { useSaveMenstrualRecords } from "@/features/menstruation/hooks/mutations/menstrual.mutation";
import { useMenstrualYearQueries } from "@/features/menstruation/hooks/queries/menstrual.query";
import styles from "@/features/menstruation/styles/MenstruationRecord.module.css";
import {
  buildMenstrualRecordsUpdate,
  type MenstrualDateSelections,
  toggleMenstrualDate,
} from "@/features/menstruation/utils/menstrualRecordSelection.util";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigation";
import { isFutureDateKey } from "@/shared/utils/dateFormat";

export default function MenstruationRecordPage() {
  const [selections, setSelections] = useState<MenstrualDateSelections>({});
  const saveInFlightRef = useRef(false);
  const { months, scrollRef, loadOlderRef, addOlderMonth } = usePastCalendarMonths();
  const { yearQueries, monthQueries, recordedRanges } = useMenstrualYearQueries(months);
  const { mutateAsync: saveRecords, isPending: isSaving } = useSaveMenstrualRecords();
  const updateRequest = buildMenstrualRecordsUpdate(selections, recordedRanges);
  const hasChanges = updateRequest.add_ranges.length > 0 || updateRequest.remove_ranges.length > 0;
  const isLoadingRecords = yearQueries.some((query) => query.isPending || query.isFetching);
  const hasRecordError = yearQueries.some((query) => query.isError);
  const canSave = hasChanges && !isLoadingRecords && !hasRecordError && !isSaving;

  const handleToggleDate = useCallback((dateKey: string, isRecorded: boolean) => {
    if (saveInFlightRef.current || isFutureDateKey(dateKey)) return;

    setSelections((previous) => toggleMenstrualDate(previous, dateKey, isRecorded));
  }, []);

  const handleSave = async () => {
    if (!canSave || saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    try {
      // mutation의 캐시 갱신이 끝난 뒤 편집 상태를 비운다.
      await saveRecords(updateRequest);
      setSelections({});
      toast.success("저장했어요");
      navigateBack();
    } catch {
      toast.error("생리 기록을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      saveInFlightRef.current = false;
    }
  };

  return (
    <div className={`page ${styles.root}`}>
      <PageHeader
        title={"생리 기록"}
        onBack={() => {
          navigateBack();
        }}
      />

      <main ref={scrollRef} className={`main ${styles.content}`}>
        <div ref={loadOlderRef} className={styles.loadOlder} aria-hidden="true" />
        <Button variant="text" size="xs" onClick={addOlderMonth}>
          이전 달 보기
        </Button>
        <MenstruationCalendar
          months={monthQueries}
          selections={selections}
          onToggleDate={handleToggleDate}
          disabled={isSaving}
        />
      </main>

      <footer className="footer">
        {hasRecordError && (
          <Button
            fullWidth
            size="s"
            variant="text"
            disabled={isLoadingRecords || isSaving}
            onClick={() => {
              yearQueries.forEach((query) => {
                if (query.isError) void query.refetch();
              });
            }}
          >
            기록을 불러오지 못했어요. 다시 시도
          </Button>
        )}
        <Button
          fullWidth
          size="m"
          variant="default"
          disabled={!canSave}
          aria-busy={isSaving || isLoadingRecords}
          onClick={() => void handleSave()}
        >
          {isSaving ? "저장 중…" : isLoadingRecords ? "기록 불러오는 중…" : "저장하기"}
        </Button>
      </footer>
    </div>
  );
}
