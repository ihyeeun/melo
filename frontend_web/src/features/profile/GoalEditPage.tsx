import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  isInRange,
  ONBOARDING_HEIGHT_RANGE,
  ONBOARDING_WEIGHT_RANGE,
} from "@/features/onboarding/constants/inputRanges";
import type { OnboardingData } from "@/features/onboarding/onboarding.types";
import {
  type GoalEditDraft,
  isGoalWeightRangeValid,
  validateStartPlan,
} from "@/features/profile/goalEdit.model";
import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { EditorInput } from "@/shared/commons/input/EditorInput";
import { ScrollWheelPicker } from "@/shared/commons/picker/ScrollWheelPicker";
import {
  getBirthYearRange,
  isValidBirthYear,
  makeYearOptions,
} from "@/shared/commons/picker/yearOptions";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";

import {
  useGoalEditDraft,
  useStartGoalEditFlow,
  useUpdateGoalEditDraft,
} from "./stores/goalEditFlow.store";

type EditableField =
  | "gender"
  | "birthYear"
  | "height"
  | "weight"
  | "activity"
  | "goal"
  | "goalWeight";

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

export default function GoalEditPage() {
  const navigate = useNavigate();
  const { data: profile, isPending } = useGetProfileQuery();
  const draft = useGoalEditDraft();
  const startGoalEditFlow = useStartGoalEditFlow();
  const updateDraft = useUpdateGoalEditDraft();
  const hasInitializedRef = useRef(false);
  const editorInputRef = useRef<HTMLInputElement>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [sheetData, setSheetData] = useState<GoalEditDraft>({});

  useEffect(() => {
    if (!profile || hasInitializedRef.current) {
      return;
    }

    startGoalEditFlow(profile);
    hasInitializedRef.current = true;
  }, [profile, startGoalEditFlow]);

  const visibleDraft = draft;

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

  const openEditor = (field: EditableField) => {
    if (!visibleDraft) return;
    setEditingField(field);
    setSheetData({ ...visibleDraft });
  };

  const closeEditor = () => {
    setEditingField(null);
    setSheetData({});
  };

  useEffect(() => {
    if (editingField !== "height" && editingField !== "weight" && editingField !== "goalWeight") {
      return;
    }

    editorInputRef.current?.focus();
  }, [editingField]);

  const applyInstantSelection = (patch: Partial<OnboardingData>) => {
    updateDraft(patch);
    closeEditor();
  };

  const applyEditor = () => {
    if (!visibleDraft || !editingField) return;

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
      const nextBirthYear = isValidBirthYear(sheetData.birthYear)
        ? sheetData.birthYear
        : birthYearDefault;

      if (!isValidBirthYear(nextBirthYear)) {
        toast.warning("출생 연도를 다시 확인해주세요");
        return;
      }

      updateDraft({ birthYear: nextBirthYear });
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
      ...visibleDraft,
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
    if (!visibleDraft) return false;
    return validateStartPlan(visibleDraft) === null;
  }, [visibleDraft]);

  const handleStartPlan = () => {
    if (!visibleDraft) return;

    const errorMessage = validateStartPlan(visibleDraft);
    if (errorMessage) {
      toast.warning(errorMessage);
      return;
    }

    navigate(PATH.GOAL_EDIT_TARGET_CALORIES);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const selectedBirthYear = isValidBirthYear(sheetData.birthYear)
    ? sheetData.birthYear
    : birthYearDefault;
  const isInstantSelectEditor =
    editingField === "gender" || editingField === "activity" || editingField === "goal";
  const hasPositiveValue = (value?: number) => value !== undefined && value > 0;
  const isEditorConfirmDisabled =
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
            <ScrollWheelPicker
              height="100%"
              highlightHeight={72}
              itemHeight={80}
              classNames={{
                item: `typo-h1 ${styles.birthYearPickerItem}`,
                itemSelected: `typo-h1 ${styles.birthYearPickerItemSelected}`,
                highlight: styles.birthYearPickerHighlight,
              }}
              columns={[
                {
                  key: "birthYear",
                  value: String(selectedBirthYear),
                  options: birthYearOptions,
                  renderOption: (value) => `${value} 년`,
                  ariaLabel: "출생연도 선택",
                },
              ]}
              onChange={(_, value) => updateSheetData({ birthYear: Number(value) })}
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
            inputRef={editorInputRef}
            type="number"
            inputMode="decimal"
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
            inputRef={editorInputRef}
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
          inputRef={editorInputRef}
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

  const isFooterDisabled = !canStartPlan;

  return (
    <div className={styles.page}>
      <PageHeader title="목표 재설정" onBack={handleBack} />

      <main className={styles.main}>
        {isPending && !visibleDraft && <GoalEditSummarySkeleton />}
        {!isPending && !visibleDraft && (
          <p className={styles.loadingText}>프로필을 불러오지 못했어요</p>
        )}

        {visibleDraft && (
          <section className={styles.summarySection}>
            {SUMMARY_FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                className={styles.summaryItem}
                onClick={() => openEditor(field.id)}
              >
                <span className={`${styles.summaryLabel} typo-title4`}>{field.label}</span>
                <div className={styles.summaryValueRow}>
                  <span className={`${styles.summaryValue} typo-body2`}>
                    {getSummaryValue(field.id, visibleDraft)}
                  </span>
                  <SystemIcon
                    name="chevron-right-thin"
                    className={styles.summaryChevron}
                    size={24}
                  />
                </div>
              </button>
            ))}
          </section>
        )}
      </main>

      <footer className={styles.footer}>
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
      </footer>

      <BottomSheet isOpen={editingField !== null} onClose={closeEditor} disableContentDrag>
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
    </div>
  );
}

function GoalEditSummarySkeleton() {
  return (
    <SkeletonStatus className={styles.summarySection} label="프로필 목표 정보를 불러오는 중입니다.">
      {SUMMARY_FIELDS.map((field) => (
        <div key={field.id} className={styles.summaryItem}>
          <Skeleton width="30%" height={22} radius={999} />
          <span className={styles.summaryValueRow}>
            <Skeleton width={92} height={22} radius={999} />
            <Skeleton width={24} height={24} variant="circle" />
          </span>
        </div>
      ))}
    </SkeletonStatus>
  );
}
