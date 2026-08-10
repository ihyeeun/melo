import { useQueryClient } from "@tanstack/react-query";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";

import { useUpsertWorkoutRecordMutation } from "@/features/health/hooks/mutations/workout.mutation";
import {
  useGetWorkoutDetailQuery,
  useGetWorkoutRecordQuery,
  workoutKeys,
} from "@/features/health/hooks/queries/workout.query";
import {
  useReplaceWorkoutRecordEditRecord,
  useWorkoutRecordEditDate,
} from "@/features/health/stores/workoutRecordEdit.store";
import {
  calculateCaloriesBurned,
  calculateWeightWorkoutDuration,
  getWorkoutSetListFromDraft,
  isBodyweightWorkout,
} from "@/features/health/utils/workoutCalories.util";
import { NutrientWarningPopover } from "@/features/meal-record/components/NutrientWarningPopover";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import {
  getWorkoutRecordEditPath,
  getWorkoutRecordPath,
  getWorkoutSearchPath,
} from "@/router/pathHelpers";
import type {
  UpsertWorkoutRecordRequestDto,
  WorkoutSetRequestDto,
} from "@/shared/api/types/api.request.dto";
import type {
  WorkoutDetailResponseDto,
  WorkoutRecordItemResponseDto,
  WorkoutSearchItemResponseDto,
} from "@/shared/api/types/api.response.dto";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useLocation,
  useSearchParams,
} from "@/shared/navigation/stackflowNavigation";
import { getTodayFormatDateKey, isValidDateKey } from "@/shared/utils/dateFormat";

import styles from "../styles/WorkoutUpsertPage.module.css";

type Intensity = NonNullable<UpsertWorkoutRecordRequestDto["intensity"]>;

type WorkoutDraft = Partial<
  Omit<UpsertWorkoutRecordRequestDto, "burned_calories" | "date" | "set_list">
> & {
  burned_calories?: number | null;
  set_list: Array<Partial<WorkoutSetRequestDto>>;
};

type WorkoutDraftState = {
  draft: WorkoutDraft;
  key: string;
};

const INTENSITY_OPTIONS: Array<{ label: string; value: Intensity }> = [
  { label: "가볍게", value: 0 },
  { label: "적당히", value: 1 },
  { label: "격하게", value: 2 },
];
const CARDIO_CALORIE_INFO_MESSAGES = [
  "MET(대사당량) 지수를 기반으로, 체중과 운동 강도를 반영해 계산한 추정치입니다. 개인의 근육량이나 실제 심박수 등에 따라 소모량은 조금 다를 수 있어요.",
] as const;
const WEIGHT_CALORIE_INFO_MESSAGES = [
  "MET 지수를 기반으로, 체중과 운동 강도를 반영해 계산한 추정치입니다. 개인의 근육량이나 실제 심박수 등에 따라 소모량은 조금 다를 수 있어요.",
] as const;
const WEIGHT_DURATION_INFO_MESSAGES = [
  "1회당 평균 수행 시간(3초)과 표준 휴식 시간(90초)을 고려해 자동 계산된 시간이에요.",
  "실제 운동 흐름에 따라 조금씩 차이가 날 수 있어요.",
] as const;

const INITIAL_DRAFT: WorkoutDraft = {
  set_list: [{ set_order: 1 }],
};

function getSafeDateKey(rawDate: string | null) {
  return rawDate && isValidDateKey(rawDate) ? rawDate : getTodayFormatDateKey();
}

function getSafeWorkoutId(rawWorkoutId: string | null) {
  if (!rawWorkoutId) return null;

  const workoutId = Number(rawWorkoutId);
  return Number.isInteger(workoutId) && workoutId > 0 ? workoutId : null;
}

function getDraftKey(date: string, workoutId: number) {
  return `${date}:${workoutId}`;
}

function isWorkoutEditMode(rawMode: string | null) {
  return rawMode === "edit";
}

function toInputNumber(value: string) {
  if (value.trim() === "") return undefined;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
}

function isValidNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function createDraftFromWorkoutRecord(record: WorkoutRecordItemResponseDto): WorkoutDraft {
  return {
    workout_duration: record.workout_duration,
    burned_calories: record.burned_calories,
    intensity: record.intensity,
    set_list:
      record.workout_type === "weight" && record.set_list?.length
        ? record.set_list.map((set) => ({
            reps: set.reps,
            set_order: set.set_order,
            weight: set.weight,
          }))
        : [{ set_order: 1 }],
  };
}

function createWorkoutRecordFromRequest(
  body: UpsertWorkoutRecordRequestDto,
  workout: WorkoutDetailResponseDto,
  workoutImage?: string,
): WorkoutRecordItemResponseDto {
  const imageFields = workoutImage ? { workout_image: workoutImage } : {};

  if (body.workout_type === "cardio") {
    return {
      burned_calories: body.burned_calories,
      intensity: body.intensity,
      ...imageFields,
      workout_duration: body.workout_duration,
      workout_id: body.workout_id,
      workout_name: workout.workout_name,
      workout_type: "cardio",
    };
  }

  return {
    burned_calories: body.burned_calories,
    set_list: body.set_list ?? [],
    ...imageFields,
    workout_duration: body.workout_duration,
    workout_id: body.workout_id,
    workout_name: workout.workout_name,
    workout_type: "weight",
  };
}

export default function WorkoutUpsertPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const location = useLocation<{
    returnDepth?: number;
    workoutRecord?: WorkoutRecordItemResponseDto;
  }>();
  const date = getSafeDateKey(searchParams.get("date"));
  const workoutId = getSafeWorkoutId(searchParams.get("workoutId"));
  const isEditMode = isWorkoutEditMode(searchParams.get("mode"));
  const workoutPathOptions = isEditMode ? ({ mode: "edit" } as const) : undefined;
  const editDate = useWorkoutRecordEditDate();
  const replaceEditRecord = useReplaceWorkoutRecordEditRecord();
  const isEditSession = isEditMode && editDate === date;
  const {
    data: workout,
    isPending: workoutQueryPending,
    isError: workoutQueryError,
  } = useGetWorkoutDetailQuery(workoutId ?? 0, {
    enabled: workoutId !== null,
  });
  const workoutRecordQuery = useGetWorkoutRecordQuery(date);
  const { data: profile } = useGetProfileQuery();
  const workoutRecordFromState =
    workoutId !== null && location.state?.workoutRecord?.workout_id === workoutId
      ? location.state.workoutRecord
      : undefined;
  const workoutRecordFromQuery = useMemo(() => {
    if (workoutId === null) return undefined;

    return workoutRecordQuery.data?.workout_list.find((record) => record.workout_id === workoutId);
  }, [workoutId, workoutRecordQuery.data?.workout_list]);
  const targetWorkoutRecord = workoutRecordFromState ?? workoutRecordFromQuery;
  const workoutPreview = useMemo(() => {
    if (workoutId === null) return undefined;

    return queryClient.getQueryData<WorkoutSearchItemResponseDto>(
      workoutKeys.catalog.previews.byId(workoutId),
    );
  }, [queryClient, workoutId]);
  const workoutImage =
    targetWorkoutRecord?.workout_image ?? workoutPreview?.workout_image ?? workout?.workout_gif;
  const draftKey = workoutId !== null ? getDraftKey(date, workoutId) : null;
  const baselineDraft = useMemo(
    () => (targetWorkoutRecord ? createDraftFromWorkoutRecord(targetWorkoutRecord) : INITIAL_DRAFT),
    [targetWorkoutRecord],
  );
  const [draftState, setDraftState] = useState<WorkoutDraftState | null>(null);
  const draft = draftState && draftState.key === draftKey ? draftState.draft : baselineDraft;

  const updateCurrentDraft = (updater: (current: WorkoutDraft) => WorkoutDraft) => {
    if (draftKey === null) return;

    setDraftState((current) => {
      const currentDraft = current?.key === draftKey ? current.draft : draft;

      return {
        draft: updater(currentDraft),
        key: draftKey,
      };
    });
  };

  const setList = useMemo(
    () =>
      getWorkoutSetListFromDraft(
        { set_list: draft.set_list },
        { defaultWeight: isBodyweightWorkout(workout) ? 0 : undefined },
      ),
    [draft.set_list, workout],
  );
  const calculatedWorkoutDuration = useMemo(
    () => (setList ? calculateWeightWorkoutDuration(setList) : undefined),
    [setList],
  );
  const calculatedBurnedCalories = useMemo(() => {
    if (!workout || !profile) return undefined;

    const burnedCalories = calculateCaloriesBurned({
      draft,
      workout,
      profile,
    });

    return burnedCalories ? Math.round(burnedCalories) : undefined;
  }, [draft, profile, workout]);
  const burnedCaloriesValue =
    draft.burned_calories === undefined
      ? calculatedBurnedCalories
      : (draft.burned_calories ?? undefined);

  const requestBody = useMemo<UpsertWorkoutRecordRequestDto | null>(() => {
    if (!workout || workoutId === null) return null;

    const workoutDuration =
      workout.workout_type === "weight" ? calculatedWorkoutDuration : draft.workout_duration;
    const burnedCalories = burnedCaloriesValue;

    if (!isValidNumber(workoutDuration) || !isValidNumber(burnedCalories)) return null;

    const baseWorkout = {
      burned_calories: burnedCalories,
      date,
      workout_duration: workoutDuration,
      workout_id: workoutId,
    };

    if (workout.workout_type === "cardio") {
      if (draft.intensity === undefined) return null;

      return {
        ...baseWorkout,
        intensity: draft.intensity,
        workout_type: "cardio",
      };
    }

    if (setList === null || setList.length === 0) return null;

    return {
      ...baseWorkout,
      set_list: setList,
      workout_type: "weight",
    };
  }, [
    burnedCaloriesValue,
    calculatedWorkoutDuration,
    date,
    draft.intensity,
    draft.workout_duration,
    setList,
    workout,
    workoutId,
  ]);
  const { mutate: upsertWorkoutRecord, isPending: isUpsertPending } =
    useUpsertWorkoutRecordMutation({
      onSuccess: () => {
        toast.success("추가되었어요");
        navigateBack({ fallbackTo: getWorkoutRecordPath(date) });
      },
    });

  const handleBack = () => {
    navigateBack({
      fallbackTo: isEditMode
        ? getWorkoutRecordEditPath(date)
        : getWorkoutSearchPath(date, workoutPathOptions),
    });
  };

  const updateDraft = (field: "burned_calories" | "workout_duration", value?: number) => {
    updateCurrentDraft((current) => ({
      ...current,
      [field]: field === "burned_calories" && value === undefined ? null : value,
      ...(field === "workout_duration" ? { burned_calories: undefined } : {}),
    }));
  };

  const updateIntensity = (intensity: Intensity) => {
    updateCurrentDraft((current) => ({
      ...current,
      intensity,
      ...(current.intensity === intensity ? {} : { burned_calories: undefined }),
    }));
  };

  const updateSet = (setOrder: number | undefined, field: "reps" | "weight", value?: number) => {
    updateCurrentDraft((current) => ({
      ...current,
      set_list: current.set_list.map((set) =>
        set.set_order === setOrder
          ? {
              ...set,
              [field]: value,
            }
          : set,
      ),
      burned_calories: undefined,
    }));
  };

  const addSet = () => {
    updateCurrentDraft((current) => {
      const nextSetOrder =
        current.set_list.reduce((maxOrder, set) => Math.max(maxOrder, set.set_order ?? 0), 0) + 1;

      return {
        ...current,
        set_list: [...current.set_list, { set_order: nextSetOrder }],
        burned_calories: undefined,
      };
    });
  };

  const removeSet = (setOrder: number | undefined) => {
    updateCurrentDraft((current) => {
      if (current.set_list.length === 1) return current;

      return {
        ...current,
        set_list: current.set_list.filter((set) => set.set_order !== setOrder),
        burned_calories: undefined,
      };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!requestBody || isUpsertPending) return;

    if (isEditSession && workout) {
      replaceEditRecord(createWorkoutRecordFromRequest(requestBody, workout, workoutImage));
      navigateBack({
        count: location.state?.returnDepth ?? 1,
        fallbackTo: getWorkoutRecordEditPath(date),
      });
      return;
    }

    upsertWorkoutRecord({
      body: requestBody,
      date,
    });
  };

  const renderWorkoutFields = () => {
    if (!workout) return null;

    if (workout.workout_type === "cardio") {
      return (
        <>
          <NumberField
            label="운동 시간"
            value={draft.workout_duration}
            onChange={(value) => updateDraft("workout_duration", value)}
            placeholder="00"
            unit="분"
            required
          />

          <Field label="운동 강도" required>
            <div className={styles.segmentGroup}>
              {INTENSITY_OPTIONS.map((option) => {
                const isActive = draft.intensity === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.segmentButton} ${isActive ? styles.segmentButtonActive : ""} typo-body3`}
                    aria-pressed={isActive}
                    onClick={() => {
                      updateIntensity(option.value);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <NumberField
            label="소모 칼로리"
            value={burnedCaloriesValue}
            onChange={(value) => updateDraft("burned_calories", value)}
            placeholder="---"
            rightSlot={
              <NutrientWarningPopover
                ariaLabel="소모 칼로리 계산 안내"
                messages={CARDIO_CALORIE_INFO_MESSAGES}
              />
            }
            unit="kcal"
            required
          />
        </>
      );
    }

    const shouldShowWeightInput = !isBodyweightWorkout(workout);

    return (
      <>
        <Field label="세트" required>
          <div className={styles.setList}>
            <div
              className={`${styles.setHeader} ${shouldShowWeightInput ? "" : styles.setHeaderBodyweight} typo-body3`}
              aria-hidden="true"
            >
              <span>세트</span>
              {shouldShowWeightInput ? <span>무게</span> : null}
              <span>횟수</span>
              <span />
            </div>

            {draft.set_list.map((set, index) => (
              <div
                key={set.set_order}
                className={`${styles.setRow} ${shouldShowWeightInput ? "" : styles.setRowBodyweight}`}
              >
                <span className={`${styles.setOrder} typo-label4`}>{index + 1}세트</span>
                {shouldShowWeightInput ? (
                  <NumberInput
                    value={set.weight}
                    onChange={(value) => updateSet(set.set_order, "weight", value)}
                    placeholder="0"
                    unit="kg"
                    ariaLabel={`${index + 1}세트 무게`}
                  />
                ) : null}
                <NumberInput
                  value={set.reps}
                  onChange={(value) => updateSet(set.set_order, "reps", value)}
                  placeholder="0"
                  unit="회"
                  ariaLabel={`${index + 1}세트 횟수`}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={draft.set_list.length === 1}
                  onClick={() => removeSet(set.set_order)}
                  aria-label={`${index + 1}세트 삭제`}
                >
                  <SystemIcon name="trash" size={18} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outlined" color="normal" size="small" fullWidth onClick={addSet}>
            <SystemIcon name="plus" size={18} />
            세트 추가
          </Button>
        </Field>

        <section className={styles.field}>
          <div className={styles.labelRow}>
            <p className={`${styles.label} typo-title3`}>운동 시간</p>
            <p className={`${styles.required} typo-caption4`}>*필수</p>
            <NutrientWarningPopover
              ariaLabel="운동 시간 계산 안내"
              messages={WEIGHT_DURATION_INFO_MESSAGES}
            />
            <p className={`${styles.unit} typo-label4 ${styles.textRight} ${styles.readOnlyTime}`}>
              {calculatedWorkoutDuration ?? "--"} 분
            </p>
          </div>
        </section>

        <NumberField
          label="소모 칼로리"
          value={burnedCaloriesValue}
          onChange={(value) => updateDraft("burned_calories", value)}
          placeholder="---"
          rightSlot={
            <NutrientWarningPopover
              ariaLabel="소모 칼로리 계산 안내"
              messages={WEIGHT_CALORIE_INFO_MESSAGES}
            />
          }
          unit="kcal"
          required
        />
      </>
    );
  };

  const renderContent = () => {
    if (workoutId === null) {
      return <StatusMessage message="운동 정보를 찾을 수 없어요" />;
    }

    if (workoutQueryPending) {
      return (
        <section className={styles.statusContainer}>
          <LoadingIndicator label="운동 정보를 불러오는 중입니다." />
        </section>
      );
    }

    if (workoutQueryError) {
      return <StatusMessage message="운동 정보를 불러오지 못했어요" />;
    }

    if (!workout) {
      return <StatusMessage message="운동 정보를 찾을 수 없어요" />;
    }

    return (
      <div className={styles.content}>
        <div className={styles.field}>
          <p className={`textAssistive typo-body3`}>운동명</p>
          <p className={`typo-title3`}>{workout.workout_name}</p>
        </div>

        {renderWorkoutFields()}
      </div>
    );
  };

  return (
    <form className={styles.page} onSubmit={handleSubmit}>
      <PageHeader title="운동 추가" onBack={handleBack} />

      <main className={styles.main}>{renderContent()}</main>

      <footer className={styles.footer}>
        <Button variant="outlined" color="normal" size="large" onClick={handleBack}>
          취소
        </Button>
        <Button
          type="submit"
          variant="filled"
          color="primary"
          size="large"
          fullWidth
          disabled={!requestBody || isUpsertPending}
        >
          저장
        </Button>
      </footer>
    </form>
  );
}

function Field({
  children,
  label,
  required = false,
  rightSlot,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
  rightSlot?: ReactNode;
}) {
  return (
    <section className={styles.field}>
      <div className={styles.labelRow}>
        <p className={`${styles.label} typo-title3`}>{label}</p>
        {required ? <p className={`${styles.required} typo-caption4`}>*필수</p> : null}
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  onChange,
  placeholder,
  readOnly = false,
  required = false,
  rightSlot,
  unit,
  value,
}: {
  label: string;
  onChange?: (value?: number) => void;
  placeholder: string;
  readOnly?: boolean;
  required?: boolean;
  rightSlot?: ReactNode;
  unit: string;
  value?: number;
}) {
  return (
    <Field label={label} required={required} rightSlot={rightSlot}>
      <NumberInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        unit={unit}
        ariaLabel={label}
      />
    </Field>
  );
}

function NumberInput({
  ariaLabel,
  inputMode = "numeric",
  onChange,
  placeholder,
  readOnly = false,
  unit,
  value,
}: {
  ariaLabel: string;
  inputMode?: "decimal" | "numeric";
  onChange?: (value?: number) => void;
  placeholder: string;
  readOnly?: boolean;
  unit: string;
  value?: number;
}) {
  return (
    <label className={styles.inputWrap}>
      <input
        className={`${styles.input} typo-body3`}
        type="number"
        inputMode={inputMode}
        min="0"
        readOnly={readOnly}
        value={value ?? ""}
        onChange={(event) => {
          if (readOnly) return;

          const raw = event.target.value;

          onChange?.(toInputNumber(raw));
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      <span className={`${styles.unit} typo-label4`}>{unit}</span>
    </label>
  );
}

function StatusMessage({ message }: { message: string }) {
  return (
    <section className={styles.statusContainer}>
      <p className="typo-body2">{message}</p>
    </section>
  );
}
