import { useGetProfileQuery } from "@/features/profile/hooks/queries/useProfileQuery";
import MapPage from "@/features/restaurant/pages/MapPage";
import RestaurantPage from "@/features/restaurant/pages/RestaurantPage";

// 지도는 테스트 계정(role이 USER가 아닌 계정)에만 먼저 보여준다.
export default function RestaurantTabPage() {
  const { data: profile } = useGetProfileQuery();
  // TODO: 정식 출시 때 MapPage로 바꾸고 이 분기를 지운다.
  return profile && profile.role !== "USER" ? <MapPage /> : <RestaurantPage />;
}
