import type { ConstructionCalculatorCategory } from "@/domain/calculations/construction/catalog";
import type { LengthFieldState } from "@/components/ui/length-field";
import type { RoofMaterialUiState } from "./material-spec-editor";
import type { CalculatorDrafts } from "./construction-drafts";
import type { ConstructionSaveSession } from "./construction-save-panel";

export type ConstructionWorkspace = {
  selectedId: string;
  category: ConstructionCalculatorCategory;
  drafts: CalculatorDrafts;
  lengthDrafts: Record<string, Record<string, LengthFieldState>>;
  dirtyDrafts: Record<string, boolean>;
  materialByCalculator: Record<string, RoofMaterialUiState>;
  sessions: Record<string, ConstructionSaveSession>;
  draftEpoch: number;
};

// shortcut: drafts survive only same-document navigation; add persistence if reload recovery becomes required.
const workspaces = new Map<string, ConstructionWorkspace>();
export const workspaceKey = (userId: string, organizationId: string, calculationId: string | null) => `${userId}:${organizationId}:${calculationId ?? "new"}`;
export const rememberedWorkspace = (key: string) => workspaces.get(key);
export const rememberWorkspace = (key: string, workspace: ConstructionWorkspace) => { workspaces.set(key, workspace); };
export const forgetWorkspace = (key: string) => { workspaces.delete(key); };
