import { useGetWaterIntakeQuery } from "@/features/water-intake/hooks/queries/useWaterIntake.query";
import styles from "@/features/water-intake/styles/WaterIntakeRecordActionButton.module.css";
import { mlToLiter } from "@/features/water-intake/utils/unit.util";
import { PATH } from "@/router/path";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { useNavigate } from "@/shared/navigation/stackflowNavigation";
import { useSelectedDateKey } from "@/shared/stores/selectedDate.store";

export function WaterIntakeRecordActionButton() {
  const selectdate = useSelectedDateKey();
  const { data: recordWaterIntake } = useGetWaterIntakeQuery(selectdate);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        navigate(PATH.WATER_INTAKE_RECORD);
      }}
      className={styles.root}
    >
      <p className="body-l-medium text-primary">오늘 섭취한 물</p>

      <div className="marginLeft">
        <span className="title-l-medium text-primary">
          {mlToLiter(recordWaterIntake?.water_intake ?? 0)}
        </span>
        <span className="body-l-regular text-tertiary"> L</span>
      </div>
      <SystemIcon name="chevron-right" size={24} className="text-secondary" />
    </button>
  );
}
