import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import style from "@/features/home/styles/TodayBodyLogSection.module.css";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import NumberField from "@/shared/commons/input/NumberField";
import { toast } from "@/shared/commons/toast/toast";
import { toOneDecimalPlace } from "@/shared/utils/numberFormat";

interface WeightLogBottomSheetProps {
  initialWeight?: number;
  onClose: () => void;
  onSubmit: (weight: number) => void;
}

const MAX_WEIGHT = 200;

function isWeightInputAllowed(inputValue: string) {
  const normalized = inputValue.trim();
  if (normalized === "") return true;
  if (!/^\d{0,3}(?:\.\d?)?$/.test(normalized)) return false;

  return Number(normalized) <= MAX_WEIGHT;
}

export default function WeightLogBottomSheet({
  initialWeight,
  onClose,
  onSubmit,
}: WeightLogBottomSheetProps) {
  const [draftWeight, setDraftWeight] = useState<number | undefined>(initialWeight);

  const canDecrease = draftWeight !== undefined && draftWeight > 1;
  const canIncrease = draftWeight === undefined || draftWeight < MAX_WEIGHT;

  const handleSubmit = () => {
    if (draftWeight === undefined) {
      toast.warning("체중을 입력해주세요");
      return;
    }

    const nextWeight = toOneDecimalPlace(draftWeight);
    if (nextWeight < 1 || nextWeight > MAX_WEIGHT) {
      toast.warning("정확한 값인지 다시 확인해주세요");
      return;
    }

    onSubmit(nextWeight);
  };

  return (
    <BottomSheet isOpen onClose={onClose}>
      <div className={style.sheetContainer}>
        <h3 className={`${style.sheetTitle} typo-title2`}>오늘의 체중</h3>
        <NumberField
          value={draftWeight}
          onChange={setDraftWeight}
          min={1}
          max={MAX_WEIGHT}
          step={0.1}
          allowOutOfRange
          normalizeValue={toOneDecimalPlace}
          isInputTextAllowed={isWeightInputAllowed}
          classNames={{
            group: style.weightNumberFieldGroup,
            decrement: style.weightAdjustButton,
            increment: style.weightAdjustButton,
            inputWrapper: style.weightValueDisplay,
            input: `typo-h2 ${style.weightNumberInput}`,
            unit: `typo-caption1 ${style.weightUnit}`,
          }}
          decrementAriaLabel="체중 0.1kg 감소"
          incrementAriaLabel="체중 0.1kg 증가"
          decrementDisabled={!canDecrease}
          incrementDisabled={!canIncrease}
          decrementIcon={<Minus size={24} />}
          incrementIcon={<Plus size={24} />}
          unit="kg"
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
        <div className={style.sheetActions}>
          <Button
            onClick={handleSubmit}
            fullWidth
            size="large"
            interaction={draftWeight !== undefined && draftWeight !== 0 ? "normal" : "disable"}
            disabled={draftWeight === undefined || draftWeight === 0}
          >
            기록하기
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
