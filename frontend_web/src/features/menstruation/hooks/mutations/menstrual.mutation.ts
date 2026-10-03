import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateMenstrualRecords } from "@/features/menstruation/api/menstrual.api";
import { menstrualKeys } from "@/features/menstruation/constants/queryKey";

export function useSaveMenstrualRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMenstrualRecords,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menstrualKeys.all }),
  });
}
