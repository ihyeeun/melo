import { useQueryClient } from "@tanstack/react-query";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";

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
  calculateWeightWorkoutDuration,
  calculateWorkoutCalories,
  getWorkoutSetListFromDraft,
  isBodyweightWorkout,
} from "@/features/health/utils/workoutCalories.util";
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
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import NumberField from "@/shared/commons/input/NumberField";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
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

const INTENSITY_OPTIONS: Array<{ label: string; value: Intensity; description: string }> = [
  { label: "가볍게", value: 0, description: "호흡이 편안하고 여유로운 정도" },
  { label: "적당히", value: 1, description: "숨이 약간 차고 이마에 땀이 맺히는 정도" },
  { label: "격하게", value: 2, description: "숨이 매우 차며 땀이 많이 나는 고강도" },
];
const WORKOUT_NUMBER_FORMAT = {
  useGrouping: false,
} satisfies Intl.NumberFormatOptions;

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
  const pendingSetFocusOrderRef = useRef<number | null>(null);
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

    const burnedCalories = calculateWorkoutCalories({
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

  const focusPendingSetInput = (setOrder: number | undefined, input: HTMLInputElement | null) => {
    if (!input || setOrder === undefined || pendingSetFocusOrderRef.current !== setOrder) return;

    pendingSetFocusOrderRef.current = null;
    input.focus();
  };

  const addSet = () => {
    updateCurrentDraft((current) => {
      const nextSetOrder =
        current.set_list.reduce((maxOrder, set) => Math.max(maxOrder, set.set_order ?? 0), 0) + 1;

      pendingSetFocusOrderRef.current = nextSetOrder;

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
        fallbackTo: getWorkoutRecordEditPath(date),
      });
      return;
    }

    upsertWorkoutRecord({
      body: requestBody,
      date,
    });
  };

  if (workoutQueryPending) {
    return <></>;
  }

  if (workoutId === null || !workout || workoutQueryError) {
    return navigateBack();
  }

  const renderWorkoutFields = () => {
    // 1. 유산소
    if (workout.workout_type === "cardio") {
      return (
        <>
          <Field label="운동 시간" required>
            <NumberField
              value={draft.workout_duration}
              onChange={(value) => updateDraft("workout_duration", value)}
              min={0}
              max={60 * 24}
              step={10}
              unit="분"
              classNames={{
                group: styles.timeInputGroup,
                decrement: styles.timeQuickActionButton,
                increment: styles.timeQuickActionButton,
                inputWrapper: styles.weightValueDisplay,
                input: `title-l-semi text-primary ${styles.timeInput}`,
                unit: `title-s-regular text-primary`,
              }}
              decrementIcon={<SystemIcon name="minus" size={18} />}
              incrementIcon={<SystemIcon name="plus" size={18} />}
              inputProps={{
                inputMode: "numeric",
                placeholder: "-",
                "aria-label": "운동한 시간 입력",
              }}
            />
          </Field>

          <Field label="운동 강도" required>
            <section className={styles.intensitySection}>
              {INTENSITY_OPTIONS.map((option) => {
                const isActive = draft.intensity === option.value;

                return (
                  <SelectedCard
                    key={option.value}
                    aria-pressed={isActive}
                    isSelected={isActive}
                    setSelectedChange={() => {
                      updateIntensity(option.value);
                    }}
                    className={styles.intensityCardItem}
                  >
                    <p className="body-l-medium text-primary">{option.label}</p>
                    <p className="body-s-regular text-secondary">{option.description}</p>
                  </SelectedCard>
                );
              })}
            </section>
          </Field>

          <LabeledNumberField
            label="소모 칼로리"
            value={burnedCaloriesValue}
            onChange={(value) => updateDraft("burned_calories", value)}
            placeholder="---"
            rightSlot={
              <InfoPopover
                ariaLabel="소모 칼로리 계산 안내"
                messages={CARDIO_CALORIE_INFO_MESSAGES}
                side="bottom"
                align="start"
              />
            }
            unit="kcal"
            required
          />
        </>
      );
    }

    // 2. 근력 운동
    const isShowWeightInput = !isBodyweightWorkout(workout);
    return (
      <>
        <Field label="세트" required>
          <div className={styles.setSection}>
            <div
              className={`${styles.setHeader} body-s-semi`}
              data-showWeightInput={isShowWeightInput}
              aria-hidden="true"
            >
              <span>세트</span>
              {isShowWeightInput && <span className="textCenter">무게</span>}
              <span className="textCenter">횟수</span>
              <span />
            </div>

            {draft.set_list.map((set, index) => (
              <div
                key={set.set_order}
                className={`${styles.setRow}`}
                data-showWeightInput={isShowWeightInput}
              >
                <span className={`${styles.setOrder} body-l-medium text-secondary`}>
                  {index + 1}
                </span>
                {isShowWeightInput && (
                  <NumberField
                    value={set.weight}
                    onChange={(value) => updateSet(set.set_order, "weight", value)}
                    inputRef={(input) => focusPendingSetInput(set.set_order, input)}
                    min={0}
                    step={0.1}
                    fractionDigits={1}
                    showControls={false}
                    unstyled
                    format={WORKOUT_NUMBER_FORMAT}
                    classNames={{
                      root: styles.setNumberField,
                      inputWrapper: styles.setInputArea,
                      input: `${styles.setInput} body-l-semi`,
                    }}
                    inputProps={{
                      placeholder: "-",
                      "aria-label": `${index + 1}세트 무게`,
                    }}
                  />
                )}
                <NumberField
                  value={set.reps}
                  onChange={(value) => updateSet(set.set_order, "reps", value)}
                  inputRef={
                    isShowWeightInput
                      ? undefined
                      : (input) => focusPendingSetInput(set.set_order, input)
                  }
                  min={0}
                  step={1}
                  fractionDigits={0}
                  showControls={false}
                  unstyled
                  format={WORKOUT_NUMBER_FORMAT}
                  classNames={{
                    root: styles.setNumberField,
                    inputWrapper: styles.setInputArea,
                    input: `${styles.setInput} body-l-semi`,
                  }}
                  inputProps={{
                    placeholder: "-",
                    "aria-label": `${index + 1}세트 횟수`,
                  }}
                />
                <button
                  type="button"
                  className={styles.deleteButton}
                  disabled={draft.set_list.length === 1}
                  onClick={() => removeSet(set.set_order)}
                  aria-label={`${index + 1}세트 삭제`}
                >
                  <SystemIcon name="delete" size={18} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outlined" border="secondary" size="s" fullWidth onClick={addSet}>
            <SystemIcon name="plus" size={18} className={styles.plusIcon} />
            세트 추가
          </Button>
        </Field>

        <LabeledNumberField
          label="소모 칼로리"
          value={burnedCaloriesValue}
          onChange={(value) => updateDraft("burned_calories", value)}
          placeholder="---"
          rightSlot={
            <InfoPopover
              ariaLabel="소모 칼로리 계산 안내"
              messages={WEIGHT_CALORIE_INFO_MESSAGES}
              className={styles.popover}
              side="bottom"
              align="start"
            />
          }
          unit="kcal"
          required
        />

        <Field
          label="예상 운동 시간"
          rightSlot={
            <InfoPopover
              ariaLabel="운동 시간 계산 안내"
              messages={WEIGHT_DURATION_INFO_MESSAGES}
              className={styles.popover}
              side="bottom"
              align="start"
            />
          }
        >
          <div className={styles.readOnlyInputArea}>
            <p className={`title-m-medium text-primary`}>
              {calculatedWorkoutDuration ?? "--"}{" "}
              <span className="body-l-medium text-tertiary">분</span>
            </p>
          </div>
        </Field>
      </>
    );
  };

  return (
    <form className={`${styles.page} page`} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <PageHeader title="운동 추가" onBack={handleBack} />
      </header>

      <main className={`${styles.content} main`}>
        <section className={styles.workoutTitleGroup}>
          <p className={`body-xs-regular text-tertiary`}>운동명</p>
          <p className={`title-m-semi text-primary`}>{workout.workout_name}</p>
        </section>

        {renderWorkoutFields()}
      </main>

      <footer className={`footer ${styles.footer}`}>
        <Button variant="outlined" border="secondary" size="m" onClick={handleBack}>
          취소
        </Button>
        <Button
          type="submit"
          variant="default"
          size="m"
          fullWidth
          disabled={!requestBody || isUpsertPending}
        >
          추가
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
        <p className={`title-s-semi text-primary`}>{label}</p>
        {rightSlot}
        {required && <p className={`${styles.required} caption-m-medium`}>*필수</p>}
      </div>
      {children}
    </section>
  );
}

function LabeledNumberField({
  label,
  onChange,
  placeholder,
  required = false,
  rightSlot,
  unit,
  value,
}: {
  label: string;
  onChange: (value?: number) => void;
  placeholder: string;
  required?: boolean;
  rightSlot?: ReactNode;
  unit: string;
  value?: number;
}) {
  return (
    <Field label={label} required={required} rightSlot={rightSlot}>
      <NumberField
        value={value}
        onChange={onChange}
        min={0}
        step={1}
        fractionDigits={0}
        unit={unit}
        showControls={false}
        unstyled
        format={WORKOUT_NUMBER_FORMAT}
        classNames={{
          inputWrapper: styles.editInputArea,
          input: `${styles.editInput} title-m-medium text-primary`,
          unit: `body-l-medium text-tertiary`,
        }}
        inputProps={{
          placeholder,
          "aria-label": label,
        }}
      />
    </Field>
  );
}
