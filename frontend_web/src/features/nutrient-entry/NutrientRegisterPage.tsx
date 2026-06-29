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
import { getMealDetailPath, getMealSearchPath } from "@/router/pathHelpers";
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

  return (
    <NutrientRegisterFormPage
      backFallbackPath={getMealSearchPath(dateKey, mealType, searchKeyword)}
      brandSearchReturnPath={PATH.NUTRIENT_ADD_REGISTER}
      dateKey={dateKey}
      initialState={locationState}
      keyword={searchKeyword}
      mealType={mealType}
      onRegisteredMenu={(savedMenuId) => {
        navigation(getMealDetailPath(dateKey, mealType, savedMenuId, searchKeyword), {
          replace: true,
          state: {
            afterAddBackCount: 2,
          },
        });
      }}
    />
  );
}
