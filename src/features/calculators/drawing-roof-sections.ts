import type { PagePoint } from "./drawing-roof-section";

export type DrawingRoofSection<T> = Readonly<{
  id: string;
  sourceDocumentId: string;
  name: string;
  page: number;
  points: readonly PagePoint[];
  coverage: "covered" | "uncovered" | "unclear";
  coverageConfirmed: boolean;
  data: T;
}>;

export function createRoofSection<T>(sourceDocumentId: string, data: T, id = crypto.randomUUID(), index = 0): DrawingRoofSection<T> {
  return { id, sourceDocumentId, name: `Tetőszakasz ${index + 1}`, page: 1, points: [], coverage: "unclear", coverageConfirmed: false, data };
}

export function updateRoofSection<T>(sections: readonly DrawingRoofSection<T>[], id: string, update: Partial<Omit<DrawingRoofSection<T>, "id" | "sourceDocumentId">>): DrawingRoofSection<T>[] {
  return sections.map((section) => section.id === id ? { ...section, ...update } : section);
}

export function removeRoofSection<T>(sections: readonly DrawingRoofSection<T>[], id: string): DrawingRoofSection<T>[] {
  return sections.filter((section) => section.id !== id);
}

/** Puts a removed section back at its former position (clamped); an id that is already present is not duplicated. */
export function restoreRoofSection<T>(sections: readonly DrawingRoofSection<T>[], section: DrawingRoofSection<T>, index: number): DrawingRoofSection<T>[] {
  if (sections.some((item) => item.id === section.id)) return [...sections];
  const at = Math.min(Math.max(index, 0), sections.length);
  return [...sections.slice(0, at), section, ...sections.slice(at)];
}

/** How a section's coverage reads in the section strip; "covered" is only trustworthy once the user confirmed it. */
export function drawingCoverageLabel<T>(section: DrawingRoofSection<T>) {
  if (section.coverage === "covered") return section.coverageConfirmed ? "fedett" : "fedett, nem igazolt";
  return section.coverage === "uncovered" ? "fedetlen" : "tisztázandó";
}
