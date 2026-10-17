import { useState } from "react";

import WaterIntakeGlass from "@/features/water-intake/components/WaterIntakeGlass";
import {
  WATER_CUP_SIZE,
  WATER_INTAKE_SIZE,
} from "@/features/water-intake/constants/waterIntakeRange.constant";
import {
  useRegisterWaterCupSizeMutation,
  useRegisterWaterIntakeMutation,
} from "@/features/water-intake/hooks/mutations/useWaterIntake.mutation";
import { useGetWaterIntakeQuery } from "@/features/water-intake/hooks/queries/useWaterIntake.query";
import styles from "@/features/water-intake/styles/WaterIntakeRecordPage.module.css";
import { literToMl, mlToLiter } from "@/features/water-intake/utils/unit.util";
import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";
import BottomSheet from "@/shared/commons/bottomSheet/BottomSheet";
import { Button } from "@/shared/commons/button/Button";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { EditorInput } from "@/shared/commons/input/EditorInput";
import NumberField from "@/shared/commons/input/NumberField";
import { Skeleton } from "@/shared/commons/skeleton/Skeleton";
import { toast } from "@/shared/commons/toast/toast";
import { navigateBack } from "@/shared/navigation/stackflowNavigationController";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

export default function WaterIntakeRecordPage() {
  const selectdate = useSelectedDateKey();
  const [editedWaterAmount, setEditedWaterAmount] = useState<number>();
  const [cupAmount, setCupAmount] = useState<number | undefined>();
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  const { data: recordWaterIntake, isPending: isWaterIntakePending } =
    useGetWaterIntakeQuery(selectdate);
  const waterAmount = editedWaterAmount ?? recordWaterIntake?.water_intake ?? 0;
  const { mutate: updateWaterIntake } = useRegisterWaterIntakeMutation({
    onSuccess: () => {
      toast.success("물 섭취를 기록했어요");
      track(EVENT_NAME.WATER_INTAKE_RECORD_COMPLETED);
      navigateBack();
    },
  });
  const { mutate: updateCupSizeMutation } = useRegisterWaterCupSizeMutation({
    onSuccess: () => {
      toast.success("컵 크기를 수정했어요");
      setIsSheetOpen(false);
    },
  });

  const handleUpdateWaterIntake = () => {
    if (waterAmount < WATER_INTAKE_SIZE.MIN || waterAmount > WATER_INTAKE_SIZE.MAX)
      return toast.warning("10L 이하로 입력해주세요");

    updateWaterIntake({ date: selectdate, water_intake: waterAmount });
  };
  const handleUpdateCupSize = (cupSize: number | undefined) => {
    if (!cupSize) return;
    if (!Number.isInteger(cupSize)) return toast.warning("컵 용량은 정수로 입력해주세요");
    if (cupSize > WATER_CUP_SIZE.MAX || cupSize < WATER_CUP_SIZE.MIN)
      return toast.warning("50~1000ml까지 설정할 수 있어요");

    updateCupSizeMutation(cupSize);
    setIsSheetOpen(false);
  };

  if (isWaterIntakePending) {
    return <SkeletonPage />;
  }

  return (
    <div className={`page ${styles.root}`}>
      <PageHeader title="물 섭취 기록" onBack={() => navigateBack()} />

      <main className={`main ${styles.content}`}>
        <h2 className="title-m-medium text-primary">
          오늘 물을 얼마나 마셨는지
          <br />
          기록해주세요
        </h2>

        <section className={styles.recordSection}>
          <WaterIntakeGlass amountMl={waterAmount} />

          <NumberField
            value={mlToLiter(waterAmount)}
            onChange={(liter) => {
              setEditedWaterAmount(literToMl(liter ?? 0));
            }}
            min={mlToLiter(WATER_INTAKE_SIZE.MIN)}
            max={mlToLiter(WATER_INTAKE_SIZE.MAX)}
            step={mlToLiter(recordWaterIntake?.cup_size ?? 100)}
            fractionDigits={2}
            format={{ minimumFractionDigits: 2 }}
            unit={"L"}
            inputProps={{
              readOnly: true,
              inputMode: "decimal",
              placeholder: "0.00",
              "aria-label": "오늘의 물 섭취량 입력",
            }}
            unstyled
            classNames={{
              group: styles.inputGroup,
              decrement: styles.quickInputButton,
              increment: styles.quickInputButton,
              inputWrapper: styles.inputWrapper,
              input: `title-xxl-semi text-primary ${styles.input}`,
              unit: `title-l-semi text-tertiary`,
            }}
            decrementIcon={<SystemIcon name="minus" size={18} />}
            incrementIcon={<SystemIcon name="plus" size={18} />}
          />

          <button
            type="button"
            onClick={() => {
              setCupAmount(recordWaterIntake?.cup_size ?? 50);
              setIsSheetOpen(true);
            }}
            className={styles.sheetOpenButton}
          >
            <p className="body-s-medium text-tertiary">
              내가 마시는 한 컵 크기 : {recordWaterIntake?.cup_size}ml
            </p>
            <SystemIcon name="chevron-right" size={12} />
          </button>
        </section>
      </main>

      <footer className={`footer`}>
        <Button onClick={() => handleUpdateWaterIntake()} size="m" variant="default" fullWidth>
          기록하기
        </Button>
      </footer>

      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
        }}
        title="컵 크기"
      >
        <section className={styles.sheetContent}>
          <EditorInput
            type="number"
            inputMode="numeric"
            value={cupAmount}
            onChange={(value) => {
              setCupAmount(value);
            }}
            unit="ml"
            placeholder="컵 용량 입력"
          />

          <Button
            disabled={!cupAmount}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => handleUpdateCupSize(cupAmount)}
          >
            확인
          </Button>
        </section>
      </BottomSheet>
    </div>
  );
}

function SkeletonPage() {
  return (
    <div className="page">
      <PageHeader title="물 섭취 기록" />

      <main className={`main ${styles.content}`}>
        <h2 className="title-m-medium text-primary">
          오늘 물을 얼마나 마셨는지
          <br />
          기록해주세요
        </h2>

        <section className={styles.skeletonContent}>
          <Skeleton width={230} height={320} />
          <Skeleton width={"80%"} height={60} />
        </section>
      </main>

      <footer className="footer">
        <Skeleton width={"100%"} height={52} />
      </footer>
    </div>
  );
}
