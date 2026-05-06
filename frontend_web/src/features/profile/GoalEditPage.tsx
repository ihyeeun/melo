import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import StepGoalCalories from "@/features/onboarding/components/steps/StepGoalCalories";
import StepNutrient from "@/features/onboarding/components/steps/StepNutrient";
import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/onboarding/constants/inputRanges";
import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import {
  updateActivity,
  updateBirthYear,
  updateGender,
  updateGoal,
  updateHeight,
  updateTargetCalories,
  updateTargetRatio,
  updateTargetWeight,
  updateWeight,
} from "@/features/profile/api/profile";
import { queryKeys } from "@/features/profile/hooks/queries/queryKey";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import type { ProfileResponseDto } from "@/shared/api/types/api.dto";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { EditorInput } from "@/shared/commons/input/EditorInput";
import { CheckButtonModal } from "@/shared/commons/modals/CheckButtonModal";
import WheelPicker from "@/shared/commons/picker/WheelPicker";
import {
  getBirthYearRange,
  isValidBirthYear,
  makeYearOptions,
} from "@/shared/commons/picker/yearOptions";
import { toast } from "@/shared/commons/toast/toast";
import { useSetTargets } from "@/shared/stores/targetNutrient.store";

type GoalEditStage = "summary" | "targetCalories" | "nutrient";
type GoalEditNavigationState = {
  goalEditFlow?: boolean;
};
type EditableField =
  | "gender"
  | "birthYear"
  | "height"
  | "weight"
  | "activity"
  | "goal"
  | "goalWeight";

type GoalEditDraft = Pick<
  OnboardingData,
  | "gender"
  | "birthYear"
  | "height"
  | "weight"
  | "activity"
  | "goal"
  | "target_weight"
  | "target_calories"
  | "carbs"
  | "protein"
  | "fat"
>;

type SummaryField = {
  id: EditableField;
  label: string;
};

const SUMMARY_FIELDS: SummaryField[] = [
  { id: "gender", label: "성별" },
  { id: "birthYear", label: "출생 연도" },
  { id: "height", label: "키" },
  { id: "weight", label: "현재 몸무게" },
  { id: "activity", label: "활동량" },
  { id: "goal", label: "목표" },
  { id: "goalWeight", label: "목표 몸무게" },
];

const ACTIVITY_OPTIONS = [
  { title: "대부분 앉아서 생활해요", description: "하루에 4,000보 이하로 걸어요" },
  { title: "가벼운 이동이 있어요", description: "하루에 4,000 ~ 7,500보 사이로 걸어요" },
  { title: "움직이는 시간이 꽤 많아요", description: "하루에 7,500 ~ 12,000보 사이로 걸어요" },
  { title: "가만히 있는 시간은 거의 없어요", description: "하루에 12,000보 이상 걸어요" },
] as const;

const ACTIVITY_LABELS = ACTIVITY_OPTIONS.map((activity) => activity.title);

const GOAL_OPTIONS = [
  { title: "다이어트", description: "체지방을 줄이고 싶어요" },
  { title: "체중 유지", description: "지금의 몸무게를 유지하고 싶어요" },
  { title: "근육 늘리기", description: "근육량을 늘리고 싶어요" },
] as const;

const GOAL_LABELS = GOAL_OPTIONS.map((goal) => goal.title);

const GOAL_CALORIES_MIN = 1;
const GOAL_CALORIES_MAX = 99999;
const RATIO_TOLERANCE = 0.001;
const GOAL_EDIT_STAGE_PATH: Record<GoalEditStage, string> = {
  summary: PATH.GOAL_EDIT,
  targetCalories: PATH.GOAL_EDIT_TARGET_CALORIES,
  nutrient: PATH.GOAL_EDIT_NUTRIENT,
};

function normalizePathname(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getGoalEditStage(pathname: string): GoalEditStage {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === PATH.GOAL_EDIT_TARGET_CALORIES) {
    return "targetCalories";
  }

  if (normalizedPathname === PATH.GOAL_EDIT_NUTRIENT) {
    return "nutrient";
  }

  return "summary";
}

function toGoalEditDraft(profile: ProfileResponseDto): GoalEditDraft {
  return {
    gender: profile.gender,
    birthYear: profile.birthYear,
    height: profile.height,
    weight: profile.weight,
    activity: profile.activity,
    goal: profile.goal,
    target_weight: profile.target_weight,
    target_calories: profile.target_calories,
    carbs: profile.target_ratio[0],
    protein: profile.target_ratio[1],
    fat: profile.target_ratio[2],
  };
}

function formatDecimal(value?: number) {
  if (value === undefined) return "-";
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function getSummaryValue(field: EditableField, draft: GoalEditDraft) {
  if (field === "gender") {
    if (draft.gender === 0) return "남성";
    if (draft.gender === 1) return "여성";
    return "-";
  }

  if (field === "birthYear") {
    return draft.birthYear !== undefined ? `${draft.birthYear}년` : "-";
  }

  if (field === "height") {
    return draft.height !== undefined ? `${formatDecimal(draft.height)}cm` : "-";
  }

  if (field === "weight") {
    return draft.weight !== undefined ? `${formatDecimal(draft.weight)}kg` : "-";
  }

  if (field === "activity") {
    return draft.activity !== undefined ? (ACTIVITY_LABELS[draft.activity] ?? "-") : "-";
  }

  if (field === "goal") {
    return draft.goal !== undefined ? (GOAL_LABELS[draft.goal] ?? "-") : "-";
  }

  return draft.target_weight !== undefined ? `${formatDecimal(draft.target_weight)}kg` : "-";
}

function isGoalWeightRangeValid(data: GoalEditDraft) {
  return isInRange(data.target_weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max);
}

function validateStartPlan(draft: GoalEditDraft) {
  if (draft.gender === undefined) return "성별을 선택해주세요";
  if (!isValidBirthYear(draft.birthYear)) return "출생 연도를 다시 확인해주세요";

  if (!isInRange(draft.height, ONBOARDING_HEIGHT_RANGE.min, ONBOARDING_HEIGHT_RANGE.max)) {
    return "키를 다시 확인해주세요";
  }

  if (!isInRange(draft.weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)) {
    return "현재 몸무게를 다시 확인해주세요";
  }

  if (draft.activity === undefined) return "활동량을 선택해주세요";
  if (draft.goal === undefined) return "목표를 선택해주세요";

  if (!isGoalWeightRangeValid(draft)) {
    return "목표 몸무게를 다시 확인해주세요";
  }

  return null;
}

function hasNutrientTotal(draft: GoalEditDraft) {
  if (draft.carbs === undefined || draft.protein === undefined || draft.fat === undefined) {
    return false;
  }

  const nutrientTotal = draft.carbs + draft.protein + draft.fat;
  return Math.abs(nutrientTotal - 100) < RATIO_TOLERANCE;
}

function isRatioChanged(initial: GoalEditDraft, draft: GoalEditDraft) {
  if (
    draft.carbs === undefined ||
    draft.protein === undefined ||
    draft.fat === undefined ||
    initial.carbs === undefined ||
    initial.protein === undefined ||
    initial.fat === undefined
  ) {
    return false;
  }

  return (
    Math.abs(draft.carbs - initial.carbs) >= RATIO_TOLERANCE ||
    Math.abs(draft.protein - initial.protein) >= RATIO_TOLERANCE ||
    Math.abs(draft.fat - initial.fat) >= RATIO_TOLERANCE
  );
}

function toUpdatedProfile(previous: ProfileResponseDto, draft: GoalEditDraft): ProfileResponseDto {
  const nextTargetRatio: [number, number, number] = [
    draft.carbs ?? previous.target_ratio[0],
    draft.protein ?? previous.target_ratio[1],
    draft.fat ?? previous.target_ratio[2],
  ];

  return {
    ...previous,
    gender: draft.gender ?? previous.gender,
    birthYear: draft.birthYear ?? previous.birthYear,
    height: draft.height ?? previous.height,
    weight: draft.weight ?? previous.weight,
    activity: draft.activity ?? previous.activity,
    goal: draft.goal ?? previous.goal,
    target_weight: draft.target_weight ?? previous.target_weight,
    target_calories: draft.target_calories ?? previous.target_calories,
    target_ratio: nextTargetRatio,
  };
}

export default function GoalEditPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setTargets = useSetTargets();
  const { data: profile, isPending } = useGetProfileQuery();

  const stage = useMemo(() => getGoalEditStage(location.pathname), [location.pathname]);
  const isPlanStage = stage === "targetCalories" || stage === "nutrient";
  const navigationState = (location.state as GoalEditNavigationState | null) ?? undefined;
  const [draft, setDraft] = useState<GoalEditDraft | null>(null);
  const [initialDraft, setInitialDraft] = useState<GoalEditDraft | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [sheetData, setSheetData] = useState<GoalEditDraft>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNutrientTotalModalOpen, setIsNutrientTotalModalOpen] = useState(false);

  useEffect(() => {
    if (!profile || draft) {
      return;
    }

    const mapped = toGoalEditDraft(profile);
    setDraft(mapped);
    setInitialDraft(mapped);
  }, [profile, draft]);

  const updateDraft = useCallback(
    (patch: Partial<OnboardingData>) => {
      if (isSubmitting) return;
      setDraft((previous) => (previous ? { ...previous, ...patch } : previous));
    },
    [isSubmitting],
  );

  const updateSheetData = useCallback((patch: Partial<OnboardingData>) => {
    setSheetData((previous) => ({ ...previous, ...patch }));
  }, []);

  const birthYearRange = useMemo(() => getBirthYearRange(), []);
  const birthYearDefault = useMemo(
    () => Math.min(Math.max(2000, birthYearRange.min), birthYearRange.max),
    [birthYearRange.max, birthYearRange.min],
  );
  const birthYearOptions = useMemo(
    () =>
      makeYearOptions({
        from: birthYearRange.max,
        count: birthYearRange.max - birthYearRange.min + 1,
      }).map(String),
    [birthYearRange.max, birthYearRange.min],
  );

  useEffect(() => {
    if (editingField !== "birthYear") return;
    if (isValidBirthYear(sheetData.birthYear)) return;

    updateSheetData({ birthYear: birthYearDefault });
  }, [birthYearDefault, editingField, sheetData.birthYear, updateSheetData]);

  const openEditor = (field: EditableField) => {
    if (!draft) return;
    setEditingField(field);
    setSheetData({ ...draft });
  };

  const closeEditor = () => {
    setEditingField(null);
    setSheetData({});
  };

  const applyInstantSelection = (patch: Partial<OnboardingData>) => {
    updateDraft(patch);
    closeEditor();
  };

  const applyEditor = () => {
    if (!draft || !editingField) return;

    if (editingField === "gender") {
      if (sheetData.gender === undefined) {
        toast.warning("성별을 선택해주세요");
        return;
      }

      updateDraft({ gender: sheetData.gender });
      closeEditor();
      return;
    }

    if (editingField === "birthYear") {
      if (!isValidBirthYear(sheetData.birthYear)) {
        toast.warning("출생 연도를 다시 확인해주세요");
        return;
      }

      updateDraft({ birthYear: sheetData.birthYear });
      closeEditor();
      return;
    }

    if (editingField === "height") {
      if (!isInRange(sheetData.height, ONBOARDING_HEIGHT_RANGE.min, ONBOARDING_HEIGHT_RANGE.max)) {
        toast.warning("키를 다시 확인해주세요");
        return;
      }

      updateDraft({ height: sheetData.height });
      closeEditor();
      return;
    }

    if (editingField === "weight") {
      if (!isInRange(sheetData.weight, ONBOARDING_WEIGHT_RANGE.min, ONBOARDING_WEIGHT_RANGE.max)) {
        toast.warning("현재 몸무게를 다시 확인해주세요");
        return;
      }

      updateDraft({ weight: sheetData.weight });
      closeEditor();
      return;
    }

    if (editingField === "activity") {
      if (sheetData.activity === undefined) {
        toast.warning("활동량을 선택해주세요");
        return;
      }

      updateDraft({ activity: sheetData.activity });
      closeEditor();
      return;
    }

    if (editingField === "goal") {
      if (sheetData.goal === undefined) {
        toast.warning("목표를 선택해주세요");
        return;
      }

      updateDraft({ goal: sheetData.goal });
      closeEditor();
      return;
    }

    const nextDraft: GoalEditDraft = {
      ...draft,
      target_weight: sheetData.target_weight,
    };

    if (!isGoalWeightRangeValid(nextDraft)) {
      toast.warning("목표 몸무게를 다시 확인해주세요");
      return;
    }

    updateDraft({ target_weight: sheetData.target_weight });
    closeEditor();
  };

  const canStartPlan = useMemo(() => {
    if (!draft) return false;
    return validateStartPlan(draft) === null;
  }, [draft]);

  const handleStartPlan = () => {
    if (!draft) return;

    const errorMessage = validateStartPlan(draft);
    if (errorMessage) {
      toast.warning(errorMessage);
      return;
    }

    navigate(GOAL_EDIT_STAGE_PATH.targetCalories, { state: navigationState });
  };

  const handleGoNutrient = () => {
    if (!draft) return;

    if (draft.target_calories === undefined || draft.target_calories < GOAL_CALORIES_MIN) {
      toast.warning("목표 칼로리를 입력해주세요");
      return;
    }

    if (draft.target_calories > GOAL_CALORIES_MAX) {
      toast.warning("목표 칼로리는 1~99999 사이로 입력해주세요");
      return;
    }

    navigate(GOAL_EDIT_STAGE_PATH.nutrient, { state: navigationState });
  };

  const handleComplete = async () => {
    if (!draft || !initialDraft) {
      return;
    }

    const errorMessage = validateStartPlan(draft);
    if (errorMessage) {
      toast.warning(errorMessage);
      return;
    }

    if (draft.target_calories === undefined) {
      toast.warning("목표 칼로리를 입력해주세요");
      return;
    }

    if (!hasNutrientTotal(draft)) {
      setIsNutrientTotalModalOpen(true);
      return;
    }

    const updateTasks: Array<() => Promise<ProfileResponseDto>> = [];

    if (draft.gender !== undefined && draft.gender !== initialDraft.gender) {
      updateTasks.push(() => updateGender(draft.gender!));
    }

    if (draft.birthYear !== undefined && draft.birthYear !== initialDraft.birthYear) {
      updateTasks.push(() => updateBirthYear(draft.birthYear!));
    }

    if (draft.height !== undefined && draft.height !== initialDraft.height) {
      updateTasks.push(() => updateHeight(draft.height!));
    }

    if (draft.weight !== undefined && draft.weight !== initialDraft.weight) {
      updateTasks.push(() => updateWeight(draft.weight!));
    }

    if (draft.activity !== undefined && draft.activity !== initialDraft.activity) {
      updateTasks.push(() => updateActivity(draft.activity!));
    }

    if (draft.goal !== undefined && draft.goal !== initialDraft.goal) {
      updateTasks.push(() => updateGoal(draft.goal!));
    }

    if (draft.target_weight !== undefined && draft.target_weight !== initialDraft.target_weight) {
      updateTasks.push(() => updateTargetWeight(draft.target_weight!));
    }

    if (
      draft.target_calories !== undefined &&
      draft.target_calories !== initialDraft.target_calories
    ) {
      updateTasks.push(() => updateTargetCalories(draft.target_calories!));
    }

    if (isRatioChanged(initialDraft, draft)) {
      updateTasks.push(() => updateTargetRatio([draft.carbs!, draft.protein!, draft.fat!]));
    }

    if (updateTasks.length === 0) {
      toast.show({ title: "변경된 내용이 없어요" });
      return;
    }

    try {
      setIsSubmitting(true);

      await Promise.all(updateTasks.map((task) => task()));

      queryClient.setQueryData<ProfileResponseDto>(queryKeys.profile, (previous) => {
        if (!previous) {
          return previous;
        }

        return toUpdatedProfile(previous, draft);
      });

      setTargets({
        target_calories: draft.target_calories!,
        target_ratio: [draft.carbs!, draft.protein!, draft.fat!],
      });
      setInitialDraft({ ...draft });

      toast.success("목표가 수정되었어요");
      if (navigationState?.goalEditFlow) {
        const backStepsByStage: Record<GoalEditStage, number> = {
          summary: -1,
          targetCalories: -2,
          nutrient: -3,
        };

        navigate(backStepsByStage[stage]);
        return;
      }

      navigate(PATH.PROFILE, { replace: true });
    } catch (error) {
      console.error(error);
      toast.warning("목표 수정에 실패했어요");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isSubmitting) return;

    if (stage === "summary") {
      navigate(-1);
      return;
    }

    if (navigationState?.goalEditFlow) {
      navigate(-1);
      return;
    }

    if (stage === "targetCalories") {
      navigate(GOAL_EDIT_STAGE_PATH.summary, { replace: true, state: navigationState });
      return;
    }

    navigate(GOAL_EDIT_STAGE_PATH.targetCalories, { replace: true, state: navigationState });
  };

  const selectedBirthYear = isValidBirthYear(sheetData.birthYear)
    ? sheetData.birthYear
    : birthYearDefault;
  const isInstantSelectEditor =
    editingField === "gender" || editingField === "activity" || editingField === "goal";
  const hasPositiveValue = (value?: number) => value !== undefined && value > 0;
  const isEditorConfirmDisabled =
    isSubmitting ||
    (editingField === "height" && !hasPositiveValue(sheetData.height)) ||
    (editingField === "weight" && !hasPositiveValue(sheetData.weight)) ||
    (editingField === "goalWeight" && !hasPositiveValue(sheetData.target_weight));

  const getSelectableCardClassName = (selected: boolean) =>
    [styles.selectableCard, selected ? styles.selectableCardActive : ""].filter(Boolean).join(" ");

  const renderEditorBody = () => {
    if (!editingField) {
      return null;
    }

    if (editingField === "gender") {
      return (
        <section className={styles.editorSection}>
          <h2 className={styles.editorTitle}>성별</h2>
          <div className={styles.genderGrid}>
            <button
              type="button"
              className={getSelectableCardClassName(sheetData.gender === 0)}
              aria-pressed={sheetData.gender === 0}
              onClick={() => applyInstantSelection({ gender: 0 })}
            >
              <span className={styles.genderCardLabel}>남성</span>
            </button>
            <button
              type="button"
              className={getSelectableCardClassName(sheetData.gender === 1)}
              aria-pressed={sheetData.gender === 1}
              onClick={() => applyInstantSelection({ gender: 1 })}
            >
              <span className={styles.genderCardLabel}>여성</span>
            </button>
          </div>
        </section>
      );
    }

    if (editingField === "birthYear") {
      return (
        <section className={styles.editorSection}>
          <h2 className={styles.editorTitle}>출생연도</h2>
          <div className={styles.birthYearPicker}>
            <WheelPicker
              value={String(selectedBirthYear)}
              options={birthYearOptions}
              suffix="년"
              height={490}
              itemHeight={80}
              onChange={(value) => updateSheetData({ birthYear: Number(value) })}
            />
          </div>
        </section>
      );
    }

    if (editingField === "height") {
      return (
        <section className={styles.editorSection}>
          <h2 className={styles.editorTitle}>키</h2>
          <EditorInput
            type="number"
            inputMode="numeric"
            value={sheetData.height}
            onChange={(value) => updateSheetData({ height: value })}
            placeholder="키 입력"
            min={ONBOARDING_HEIGHT_RANGE.min}
            max={ONBOARDING_HEIGHT_RANGE.max}
            step={1}
            blockOutOfRangeInput
            fractionDigits={1}
            unit="cm"
            clampOnChange={false}
            normalizeOnBlur={false}
          />
        </section>
      );
    }

    if (editingField === "weight") {
      return (
        <section className={styles.editorSection}>
          <h2 className={styles.editorTitle}>현재 몸무게</h2>
          <EditorInput
            type="number"
            inputMode="decimal"
            value={sheetData.weight}
            onChange={(value) => updateSheetData({ weight: value })}
            placeholder="현재 몸무게 입력"
            min={ONBOARDING_WEIGHT_RANGE.min}
            max={ONBOARDING_WEIGHT_RANGE.max}
            step={0.1}
            fractionDigits={1}
            blockOutOfRangeInput
            unit="kg"
            clampOnChange={false}
            normalizeOnBlur={false}
          />
        </section>
      );
    }

    if (editingField === "activity") {
      return (
        <section className={styles.editorSection}>
          <h2 className={styles.editorTitle}>활동량</h2>
          <div className={styles.optionList}>
            {ACTIVITY_OPTIONS.map((activity, index) => (
              <button
                key={activity.title}
                type="button"
                className={getSelectableCardClassName(sheetData.activity === index)}
                aria-pressed={sheetData.activity === index}
                onClick={() =>
                  applyInstantSelection({ activity: index as OnboardingData["activity"] })
                }
              >
                <p className={`${styles.optionTitle} typo-title3`}>{activity.title}</p>
                <p className={`${styles.optionDescription} typo-body3`}>{activity.description}</p>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (editingField === "goal") {
      return (
        <section className={styles.editorSection}>
          <h2 className={styles.editorTitle}>목표</h2>
          <div className={styles.optionList}>
            {GOAL_OPTIONS.map((goal, index) => (
              <button
                key={goal.title}
                type="button"
                className={getSelectableCardClassName(sheetData.goal === index)}
                aria-pressed={sheetData.goal === index}
                onClick={() => applyInstantSelection({ goal: index as OnboardingData["goal"] })}
              >
                <p className={`${styles.optionTitle} typo-title3`}>{goal.title}</p>
                <p className={`${styles.optionDescription} typo-body3`}>{goal.description}</p>
              </button>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className={styles.editorSection}>
        <h2 className={styles.editorTitle}>목표 몸무게</h2>
        <EditorInput
          type="number"
          inputMode="decimal"
          value={sheetData.target_weight}
          onChange={(value) => updateSheetData({ target_weight: value })}
          placeholder="목표 몸무게 입력"
          min={ONBOARDING_WEIGHT_RANGE.min}
          max={ONBOARDING_WEIGHT_RANGE.max}
          step={0.1}
          fractionDigits={1}
          blockOutOfRangeInput
          unit="kg"
          clampOnChange={false}
          normalizeOnBlur={false}
        />
      </section>
    );
  };

  const isFooterDisabled = isSubmitting || (stage === "summary" && !canStartPlan);

  return (
    <div className={`${styles.page} ${isPlanStage ? styles.pageWhite : ""}`}>
      <PageHeader title={isPlanStage ? undefined : "목표 재설정"} onBack={handleBack} />

      <main className={styles.main}>
        {isPending && !draft && <p className={styles.loadingText}>불러오는 중...</p>}
        {!isPending && !draft && <p className={styles.loadingText}>프로필을 불러오지 못했어요</p>}

        {draft && stage === "summary" && (
          <section className={styles.summarySection}>
            {SUMMARY_FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                className={styles.summaryItem}
                onClick={() => openEditor(field.id)}
              >
                <span className={`${styles.summaryLabel} typo-title3`}>{field.label}</span>
                <span className={styles.summaryValueRow}>
                  <span className={`${styles.summaryValue} typo-label1`}>
                    {getSummaryValue(field.id, draft)}
                  </span>
                  <ChevronRight className={styles.summaryChevron} size={24} />
                </span>
              </button>
            ))}
          </section>
        )}

        {draft && stage === "targetCalories" && (
          <section className={styles.stageSection}>
            <StepGoalCalories data={draft} update={updateDraft} />
          </section>
        )}

        {draft && stage === "nutrient" && (
          <section className={styles.stageSection}>
            <StepNutrient data={draft} update={updateDraft} />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        {stage === "summary" && (
          <Button
            onClick={handleStartPlan}
            disabled={isFooterDisabled}
            fullWidth
            variant="filled"
            size="large"
            interaction={isFooterDisabled ? "disable" : "normal"}
          >
            새로운 식단 계획 받기
          </Button>
        )}

        {stage === "targetCalories" && (
          <Button
            onClick={handleGoNutrient}
            disabled={isSubmitting}
            fullWidth
            variant="filled"
            size="large"
            interaction={isSubmitting ? "disable" : "normal"}
          >
            다음
          </Button>
        )}

        {stage === "nutrient" && (
          <Button
            onClick={handleComplete}
            disabled={isSubmitting}
            fullWidth
            variant="filled"
            size="large"
            interaction={isSubmitting ? "disable" : "normal"}
          >
            {isSubmitting ? "완료 중..." : "완료"}
          </Button>
        )}
      </footer>

      <BottomSheet
        isOpen={editingField !== null}
        onClose={closeEditor}
        className={styles.goalEditBottomSheet}
        disableContentDrag
      >
        <div className={styles.sheetContent} data-editor-field={editingField ?? undefined}>
          <div className={styles.sheetBody}>{renderEditorBody()}</div>
          {!isInstantSelectEditor && (
            <div className={styles.sheetActions}>
              <Button
                fullWidth
                onClick={applyEditor}
                variant="filled"
                size="large"
                color="primary"
                disabled={isEditorConfirmDisabled}
                interaction={isEditorConfirmDisabled ? "disable" : "normal"}
              >
                확인
              </Button>
            </div>
          )}
        </div>
      </BottomSheet>

      <CheckButtonModal
        open={isNutrientTotalModalOpen}
        onOpenChange={setIsNutrientTotalModalOpen}
        title="영양소 비율 확인"
        description="탄단지 비율의 합을 100으로 맞춰주세요"
      />
    </div>
  );
}
