export function selectedEdgeIdsFromQuery(value: string | undefined): string[] {
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 160))].slice(0, 100) : [];
    } catch { return []; }
  }
  return [...new Set(value.split(",").filter((item) => item.length > 0 && item.length <= 160))].slice(0, 100);
}
