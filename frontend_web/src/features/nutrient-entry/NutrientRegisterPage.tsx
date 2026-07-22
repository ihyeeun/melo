import {
  getMealType,
  getSafeDateKey,
  getSafeKeyword,
} from "@/features/meal-record/utils/mealRecord.queryParams";
import {
  NutrientRegisterFormPage,
  type NutrientRegisterFormState,
} from "@/features/nutrient-entry/components/NutrientRegisterFormPage";
import { PATH } from "@/router/path";
import {
  getFolderMenuDetailPath,
  getMealDetailPath,
  getMealRecordPath,
  getMenuSetMenuDetailPath,
  getPathWithMealMode,
  type PersonalMenuEditMode,
} from "@/router/pathHelpers";
import { useLocation, useNavigate, useSearchParams } from "@/shared/navigation/stackflowNavigation";

export default function NutrientRegisterPage() {
  const navigation = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = (location.state ?? {}) as NutrientRegisterFormState;
  const dateKey = getSafeDateKey(searchParams.get("date") ?? locationState.dateKey ?? null);
  const mealType = getMealType(searchParams.get("mealType") ?? locationState.mealType ?? null);
  const searchKeyword = getSafeKeyword(
    searchParams.get("keyword") ?? locationState.keyword ?? null,
  );
  const editMode = getPersonalMenuEditMode(searchParams.get("mode") ?? locationState.mode ?? null);
  const backFallbackPath = getPathWithMealMode(
    PATH.MEAL_RECORD_ADD_SEARCH,
    dateKey,
    mealType,
    editMode,
    searchKeyword,
  );
  const backReturnPath = locationState.backReturnPath;
  const afterAddReturnPath =
    locationState.afterAddReturnPath ??
    (editMode === "folder"
      ? PATH.CREATE_FOLDER
      : editMode === "set"
        ? PATH.CREATE_MENU_SET
        : getMealRecordPath(dateKey, mealType));

  const getRegisteredMenuDetailPath = (savedMenuId: number) => {
    if (editMode === "folder") {
      return getFolderMenuDetailPath(savedMenuId);
    }

    if (editMode === "set") {
      return getMenuSetMenuDetailPath(savedMenuId);
    }

    return getMealDetailPath(dateKey, mealType, savedMenuId, searchKeyword);
  };

  return (
    <NutrientRegisterFormPage
      backFallbackPath={backFallbackPath}
      backReturnPath={backReturnPath}
      brandSearchReturnPath={PATH.NUTRIENT_ADD_REGISTER}
      dateKey={dateKey}
      initialState={locationState}
      keyword={searchKeyword}
      mealType={mealType}
      mode={editMode}
      onRegisteredMenu={(savedMenuId) => {
        navigation(getRegisteredMenuDetailPath(savedMenuId), {
          replace: true,
          state: {
            ...(backReturnPath ? { backReturnPath } : {}),
            afterAddReturnPath,
          },
        });
      }}
    />
  );
}

function getPersonalMenuEditMode(value: string | null): PersonalMenuEditMode | null {
  if (value === "folder" || value === "set") {
    return value;
  }

  return null;
}
