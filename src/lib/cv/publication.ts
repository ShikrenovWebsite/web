export type PublishableCvItem = {
  itemType: string;
  createdRecordId: string | null;
};

export function groupPublishableCvRecordIds(items: PublishableCvItem[]) {
  const grouped = {
    PROFILE: [] as string[],
    EXPERIENCE: [] as string[],
    EDUCATION: [] as string[],
    SKILL: [] as string[],
    PROJECT: [] as string[],
  };
  for (const item of items) {
    if (item.createdRecordId && item.itemType in grouped) {
      const values = grouped[item.itemType as keyof typeof grouped];
      if (!values.includes(item.createdRecordId)) {
        values.push(item.createdRecordId);
      }
    }
  }
  return grouped;
}
