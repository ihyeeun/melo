export const folderQueryKeys = {
  list: ["folder-list"] as const,
  detail: (folderId: number) => ["folder-detail", folderId] as const,
} as const;
