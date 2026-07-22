export const menuSetQueryKeys = {
  list: ["menu-set-list"] as const,
  detail: (setId: number) => ["menu-set-detail", setId] as const,
} as const;
