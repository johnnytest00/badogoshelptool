/**
 * T4: the one compact status strip for the drawing panel — which phase the user is in and what is still open.
 *
 * It only *reports* state that the panel already computes; it decides nothing, blocks nothing and never invents a
 * status. Calibration is optional by contract (it proves no roof geometry), so it is never the next step and never
 * counts as outstanding work. The detailed warnings stay where they are: this strip is a pointer, not a replacement
 * for "Teendők és figyelmeztetések", the assumption confirmations or the save gate.
 */
export type DrawingStepId = "plan" | "section" | "calibration" | "fields" | "material" | "save";

export type DrawingStep = Readonly<{
  id: DrawingStepId;
  label: string;
  /** Short, user-facing state for this step. */
  state: string;
  done: boolean;
  /** An optional step is never the next step and never reported as outstanding. */
  optional: boolean;
}>;

export type DrawingStepInput = Readonly<{
  /** The user's own answer for the current page, already resolved to its label; "" when unanswered. */
  planKindLabel: string;
  pageNumber: number;
  multiPage: boolean;
  /** Section handling is only active where the calculator actually scopes a takeoff to a section. */
  sectionActive: boolean;
  sectionName: string;
  sectionReady: boolean;
  calibrationAccepted: boolean;
  missingFieldCount: number;
  unconfirmedAssumptionCount: number;
  /**
   * P3.3d: the calculator's OWN material statement, passed through unchanged; null where this calculator has no
   * material inputs. The strip never decides material readiness itself. A group nobody asked for is not
   * outstanding work, so an unrequested material block is optional and never the next step.
   */
  material: Readonly<{
    /** The takeoff status the calculator itself produced, or null while it has not judged yet (the geometry is still open). */
    status: "VALID" | "INCOMPLETE" | "INVALID" | "UNSUPPORTED" | null;
    requested: boolean;
    openLabels: readonly string[];
  }> | null;
  /** P3.3d: read-only save state; null where the calculation cannot be saved from here. The strip reports it, the save gate stays the save panel's. */
  save: Readonly<{ revisionNumber: number; dirty: boolean }> | null;
}>;

export function drawingSteps(input: DrawingStepInput): readonly DrawingStep[] {
  const steps: DrawingStep[] = [];

  steps.push({
    id: "plan",
    label: input.multiPage ? `${input.pageNumber}. lap` : "A lap",
    state: input.planKindLabel || "nincs megadva",
    done: input.planKindLabel !== "",
    optional: false,
  });

  if (input.sectionActive) {
    steps.push({
      id: "section",
      label: "Szakasz",
      state: input.sectionReady ? `${input.sectionName.trim()} · fedett` : input.sectionName.trim() ? "kijelölés hiányzik" : "nincs megadva",
      done: input.sectionReady,
      optional: false,
    });
  }

  steps.push({
    id: "calibration",
    label: "Lépték",
    state: input.calibrationAccepted ? "igazolva" : "nem kötelező",
    done: input.calibrationAccepted,
    optional: true,
  });

  const outstanding = input.missingFieldCount + input.unconfirmedAssumptionCount;
  steps.push({
    id: "fields",
    label: "Mezők",
    state: input.missingFieldCount > 0
      ? `${input.missingFieldCount} hiányzik${input.unconfirmedAssumptionCount > 0 ? `, ${input.unconfirmedAssumptionCount} megerősítendő` : ""}`
      : input.unconfirmedAssumptionCount > 0 ? `${input.unconfirmedAssumptionCount} megerősítendő` : "kész",
    done: outstanding === 0,
    optional: false,
  });

  if (input.material) {
    const material = input.material;
    const state = !material.requested ? "nincs kérve"
      : material.status === null ? "még nem értékelhető"
        : material.status === "VALID" ? "kész"
          : material.status === "INVALID" ? "érvénytelen adat"
            : material.status === "UNSUPPORTED" ? "nem támogatott"
              : material.openLabels.length > 0 ? `${material.openLabels.join(", ")} hiányos` : "hiányos";
    steps.push({ id: "material", label: "Anyag", state, done: material.requested && material.status === "VALID", optional: !material.requested });
  }

  if (input.save) {
    const { revisionNumber, dirty } = input.save;
    steps.push({
      id: "save",
      label: "Mentés",
      state: revisionNumber === 0 ? "nincs mentve" : dirty ? `V${revisionNumber} · mentetlen módosítás` : `V${revisionNumber} · mentve`,
      done: revisionNumber > 0 && !dirty,
      optional: false,
    });
  }

  return steps;
}

/** The first required step that is not done: what the strip marks as the current task. */
export function nextDrawingStep(steps: readonly DrawingStep[]) {
  return steps.find((step) => !step.optional && !step.done) ?? null;
}
