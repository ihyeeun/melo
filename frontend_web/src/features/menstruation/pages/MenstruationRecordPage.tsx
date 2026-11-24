import { useCallback, useEffect, useRef, useState } from "react";

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
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import { PATH } from "@/router/path";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import { isRequestAbortError } from "@/shared/api/requestCancellation";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigation";

// screen: MEN-01-002
export default function MenstruationRecordPage() {
  const { data: profile } = useGetProfileQuery();
  // 월경 기록은 여성만 쓴다. 주소로 바로 들어온 경우에도 돌려보낸다
  const isNotFemale = profile !== undefined && profile.gender !== 1;
  const [selections, setSelections] = useState<MenstrualDateSelections>({});
  const saveInFlightRef = useRef(false);
  const { months, scrollRef, loadOlderRef } = usePastCalendarMonths();
  const { yearQueries, monthQueries, recordedRanges } = useMenstrualYearQueries(months);
  const { mutateAsync: saveRecords, isPending: isSaving } = useSaveMenstrualRecords();
  const updateRequest = buildMenstrualRecordsUpdate(selections, recordedRanges);
  const hasChanges = updateRequest.add_ranges.length > 0 || updateRequest.remove_ranges.length > 0;
  const isLoadingRecords = yearQueries.some((query) => query.isPending || query.isFetching);
  const hasRecordError = yearQueries.some((query) => query.isError);
  const canSave = hasChanges && !isLoadingRecords && !hasRecordError && !isSaving;

  useEffect(() => {
    if (isNotFemale) navigateBack({ fallbackTo: PATH.HOME, animate: false });
  }, [isNotFemale]);

  const handleToggleDate = useCallback((dateKey: string, isRecorded: boolean) => {
    if (saveInFlightRef.current) return;

    setSelections((previous) => toggleMenstrualDate(previous, dateKey, isRecorded));
  }, []);

  const handleSave = async () => {
    if (!canSave || saveInFlightRef.current) return;
    saveInFlightRef.current = true;

    try {
      // mutation의 캐시 갱신이 끝난 뒤 편집 상태를 비운다.
      await saveRecords(updateRequest);
      track(EVENT_NAME.MENSTRUAL_RECORDED);
      setSelections({});
      toast.success("생리 기록을 저장했어요");
      navigateBack();
    } catch (error) {
      if (isRequestAbortError(error)) return;
      toast.error("생리 기록을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      saveInFlightRef.current = false;
    }
  };

  if (isNotFemale) return null;

  return (
    <div className={`page ${styles.root}`}>
      <header className={styles.header}>
        <PageHeader
          title={"월경 기록"}
          onBack={() => {
            navigateBack();
          }}
        />
      </header>

      <div className={styles.captionSection}>
        <p className="title-s-semi text-primary textCenter">
          최근 월경 기간을 <br />
          시작일~종료일까지 모두 선택해주세요
        </p>
        <div className={styles.chip}>
          <p className="caption-m-medium text-tertiary">여러 기간을 기록할수록 예측이 정확해져요</p>
        </div>
      </div>

      <main ref={scrollRef} className={`main ${styles.content}`}>
        <div ref={loadOlderRef} className={styles.loadOlder} aria-hidden="true" />
        <MenstruationCalendar
          months={monthQueries}
          selections={selections}
          onToggleDate={handleToggleDate}
          disabled={isSaving}
        />
      </main>

      <footer className="footer">
        {hasRecordError && (
          <div className={styles.loadError}>
            <p className="body-s-medium text-secondary">기록을 불러오지 못했어요</p>
            <Button
              size="xs"
              variant="text"
              disabled={isLoadingRecords || isSaving}
              onClick={() => {
                yearQueries.forEach((query) => {
                  if (query.isError) void query.refetch();
                });
              }}
            >
              다시 시도
            </Button>
          </div>
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
