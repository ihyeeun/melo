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
import {
  useGoalEditDraft,
  useStartGoalEditFlow,
  useUpdateGoalEditDraft,
} from "@/features/profile/stores/goalEditFlow.store";
import styles from "@/features/profile/styles/GoalEditPage.module.css";
import { PATH } from "@/router/path";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { SelectedCard } from "@/shared/commons/card/SelectedCard";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { EditorInput } from "@/shared/commons/input/EditorInput";
import NumberField from "@/shared/commons/input/NumberField";
import {
  getBirthYearRange,
  isValidBirthYear,
  makeYearOptions,
} from "@/shared/commons/picker/yearOptions";
import { InfoPopover } from "@/shared/commons/popover/InfoPopover";
import { Skeleton, SkeletonStatus } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import {
  navigateBack,
  useNavigate,
  useStackflowBackHandler,
} from "@/shared/navigation/stackflowNavigation";
import { toOneDecimalPlace } from "@/shared/utils/numberFormat";

type EditableField =
  | "gender"
  | "birthYear"
  | "height"
  | "weight"
  | "activity"
  | "goal"
  | "goalWeight";

type SheetEditableField = Exclude<EditableField, "birthYear">;

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
  const [editingField, setEditingField] = useState<SheetEditableField | null>(null);
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
    if (!visibleDraft || field === "birthYear") return;
    setEditingField(field);
    setSheetData({ ...visibleDraft });
  };

  const closeEditor = useCallback(() => {
    setEditingField(null);
    setSheetData({});
  }, []);

  const handleBackGuard = useCallback(() => {
    if (editingField === null) return false;

    closeEditor();
    return true;
  }, [closeEditor, editingField]);

  useStackflowBackHandler(handleBackGuard);

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
    navigateBack();
  };

  const currentBirthYear = visibleDraft?.birthYear;
  const selectedBirthYear = isValidBirthYear(currentBirthYear)
    ? currentBirthYear
    : birthYearDefault;
  const selectDefaultBirthYear = () => {
    if (!isValidBirthYear(currentBirthYear)) {
      updateDraft({ birthYear: birthYearDefault });
    }
  };
  const isInstantSelectEditor =
    editingField === "gender" || editingField === "activity" || editingField === "goal";
  const hasPositiveValue = (value?: number) => value !== undefined && value > 0;
  const isEditorConfirmDisabled =
    (editingField === "height" && !hasPositiveValue(sheetData.height)) ||
    (editingField === "weight" && !hasPositiveValue(sheetData.weight)) ||
    (editingField === "goalWeight" && !hasPositiveValue(sheetData.target_weight));

  const renderEditorBody = () => {
    if (!editingField) {
      return null;
    }

    if (editingField === "gender") {
      return (
        <section>
          <h2 className={styles.editorTitle}>성별</h2>
          <div className={styles.genderGrid}>
            <SelectedCard
              isSelected={sheetData.gender === 0}
              className={styles.selectedCard}
              setSelectedChange={() => applyInstantSelection({ gender: 0 })}
            >
              <p className={`body-l-medium text-secondary textCenter`}>남성</p>
            </SelectedCard>

            <SelectedCard
              isSelected={sheetData.gender === 1}
              className={styles.selectedCard}
              setSelectedChange={() => applyInstantSelection({ gender: 1 })}
            >
              <p className={`body-l-medium text-secondary textCenter`}>여성</p>
            </SelectedCard>
          </div>
        </section>
      );
    }

    if (editingField === "height") {
      return (
        <section>
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
        <section>
          <h2 className={styles.editorTitle}>현재 몸무게</h2>

          <NumberField
            value={sheetData.weight}
            onChange={(value) => updateSheetData({ weight: value })}
            min={ONBOARDING_WEIGHT_RANGE.min}
            max={ONBOARDING_WEIGHT_RANGE.max}
            step={0.1}
            normalizeValue={toOneDecimalPlace}
            decrementAriaLabel="체중 0.1kg 감소"
            incrementAriaLabel="체중 0.1kg 증가"
            decrementIcon={<SystemIcon name="minus-circle" mode="image" size={28} />}
            incrementIcon={<SystemIcon name="plus-circle" mode="image" size={28} />}
            classNames={{
              group: styles.weightNumberFieldGroup,
              decrement: styles.weightAdjustButton,
              increment: styles.weightAdjustButton,
              inputWrapper: styles.weightValueDisplay,
              input: `title-xl-medium text-primary ${styles.weightNumberInput}`,
              unit: `title-s-regular text-tertiary`,
            }}
            unit=" kg"
            unstyled
            format={{
              maximumFractionDigits: 1,
              minimumFractionDigits: 0,
              useGrouping: false,
            }}
            inputProps={{
              inputMode: "decimal",
              placeholder: "0",
              "aria-label": "오늘의 체중 입력",
            }}
          />
        </section>
      );
    }

    if (editingField === "activity") {
      return (
        <section>
          <h2 className={styles.editorTitle}>활동량</h2>
          {ACTIVITY_OPTIONS.map((activity, index) => (
            <SelectedCard
              key={activity.title}
              isSelected={sheetData.activity === index}
              className={styles.segmentCard}
              aria-pressed={sheetData.activity === index}
              setSelectedChange={() =>
                applyInstantSelection({ activity: index as OnboardingData["activity"] })
              }
            >
              <p className={`body-l-medium text-primary`}>{activity.title}</p>
              <p className={`body-s-regular text-secondary`}>{activity.description}</p>
            </SelectedCard>
          ))}
        </section>
      );
    }

    if (editingField === "goal") {
      return (
        <section>
          <h2 className={styles.editorTitle}>목표</h2>
          {GOAL_OPTIONS.map((goal, index) => (
            <SelectedCard
              key={goal.title}
              isSelected={sheetData.goal === index}
              className={styles.segmentCard}
              aria-pressed={sheetData.goal === index}
              setSelectedChange={() =>
                applyInstantSelection({ goal: index as OnboardingData["goal"] })
              }
            >
              <p className={`body-l-medium text-primary`}>{goal.title}</p>
              <p className={`body-s-regular text-secondary`}>{goal.description}</p>
            </SelectedCard>
          ))}
        </section>
      );
    }

    return (
      <section>
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

  if (isPending) return <GoalEditSummarySkeleton />;
  if (!visibleDraft) return <p>error</p>;

  return (
    <div className={`${styles.page} page`}>
      <PageHeader title="정보 및 목표 수정" onBack={handleBack} />

      <main className={`main ${styles.content}`}>
        {SUMMARY_FIELDS.map((field) => {
          const isBirthItem = field.id === "birthYear";

          return (
            <button
              key={field.id}
              type="button"
              className={`${styles.editItem} ${isBirthItem ? styles.birthYearItem : ""}`}
              onClick={() => openEditor(field.id)}
            >
              <span className={`body-l-medium text-primary`}>{field.label}</span>
              <div className={styles.profileMeta}>
                <span className={`body-l-regular text-tertiary`}>
                  {getSummaryValue(field.id, visibleDraft)}
                </span>
                <SystemIcon name="chevron-right" className="text-secondary" size={16} />
              </div>

              {isBirthItem && (
                <select
                  className={styles.birthYearSelect}
                  value={String(selectedBirthYear)}
                  aria-label="출생 연도 선택"
                  onFocus={selectDefaultBirthYear}
                  onPointerDown={selectDefaultBirthYear}
                  onChange={(event) => updateDraft({ birthYear: Number(event.target.value) })}
                >
                  {birthYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              )}
            </button>
          );
        })}
      </main>

      <footer className={`footer`}>
        <div className={styles.planInfoAnchor}>
          <InfoPopover defaultOpen side="top" align="center" ariaLabel="수정한 정보 반영 안내">
            <p className={styles.planInfoMessage}>
              수정한 정보는 새로운 식단 계획을 받아야
              <br />
              목표 칼로리에 반영돼요
            </p>
          </InfoPopover>
        </div>
        <Button
          onClick={handleStartPlan}
          disabled={isFooterDisabled}
          fullWidth
          variant="outlined"
          size="m"
        >
          새로운 식단 계획 받기
        </Button>
      </footer>

      <BottomSheet isOpen={editingField !== null} onClose={closeEditor} disableContentDrag>
        <div className={styles.sheetMain} data-editor-field={editingField ?? undefined}>
          <div className={styles.sheetContent}>{renderEditorBody()}</div>
          {!isInstantSelectEditor && (
            <div className={styles.sheetActionButton}>
              <Button
                fullWidth
                onClick={applyEditor}
                variant="default"
                size="m"
                disabled={isEditorConfirmDisabled}
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
          <span className={styles.profileMeta}>
            <Skeleton width={92} height={22} radius={999} />
            <Skeleton width={24} height={24} variant="circle" />
          </span>
        </div>
      ))}
    </SkeletonStatus>
  );
}
