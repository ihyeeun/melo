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
import { getMealDetailPath, getMealRecordPath, getMealSearchPath } from "@/router/pathHelpers";
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
  const backFallbackPath = getMealSearchPath(dateKey, mealType, searchKeyword);
  const backReturnPath = locationState.backReturnPath;
  const afterAddReturnPath =
    locationState.afterAddReturnPath ?? getMealRecordPath(dateKey, mealType);

  return (
    <NutrientRegisterFormPage
      backFallbackPath={backFallbackPath}
      backReturnPath={backReturnPath}
      brandSearchReturnPath={PATH.NUTRIENT_ADD_REGISTER}
      dateKey={dateKey}
      initialState={locationState}
      keyword={searchKeyword}
      mealType={mealType}
      onRegisteredMenu={(savedMenuId) => {
        navigation(getMealDetailPath(dateKey, mealType, savedMenuId, searchKeyword), {
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
