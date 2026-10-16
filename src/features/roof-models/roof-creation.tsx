"use client";

import { useState } from "react";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";
import type { SheetLayoutMaterialOption } from "./sheet-layout-data";
import { RoofTypeSelector } from "./roof-type-selector";
import { GableRoofCalculatorForm } from "./gable-roof-form";
import { StandaloneGablePreview } from "./standalone-gable-preview";
import { MultiRoofCalculatorForm } from "./multi-roof-form";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { BackNavigation } from "@/components/navigation/back-navigation";

export function RoofCreation({ organizationId, projectId, sheetLayoutMaterials = [] }: Readonly<{ organizationId: string; projectId?: string; sheetLayoutMaterials?: readonly SheetLayoutMaterialOption[] }>) {
  const [selected, setSelected] = useState<RoofGeometryType | null>(null);
  const [workspaceState, setWorkspaceState] = useState({ dirty: false, pending: false });
  const { requestConfirmation, notify } = useAppInteraction();
  const canLeaveEditor = async (message: string, action: string) => {
    if (workspaceState.pending) { notify({ kind: "warning", message: "Mentés folyamatban. Várd meg a művelet végét." }); return false; }
    if (!workspaceState.dirty) return true;
    return requestConfirmation({ title: "Mentetlen módosítások", message, cancelLabel: "Maradok", actions: [{ label: action, tone: "danger", run: () => undefined }] });
  };
  const choose = async (type: RoofGeometryType) => {
    if (selected && selected !== type && !await canLeaveEditor("A nem mentett tetőméretek elvesznek. Tetőformát váltasz?", "Tetőforma váltása")) return;
    setSelected(type);
  };
  if (!selected) return <div className="roof-calculator">{!projectId && <BackNavigation href={`/kalkulatorok?organization=${organizationId}`} label="Vissza a kalkulátorokhoz" />}<RoofTypeSelector selected={null} onSelect={choose} /></div>;
  const changeType = async () => {
    if (!await canLeaveEditor("A nem mentett tetőméretek elvesznek. Visszatérsz a tetőformákhoz?", "Vissza a tetőformákhoz")) return;
    setSelected(null);
  };
  return <div className="roof-calculator">
    {!projectId && <BackNavigation href={`/kalkulatorok?organization=${organizationId}`} label="Vissza a kalkulátorokhoz" />}
    {selected === "gable" && (projectId
      ? <><button className="secondary-button" type="button" onClick={() => void changeType()}>← Tetőtípus kiválasztása</button><GableRoofCalculatorForm organizationId={organizationId} projectId={projectId} sheetLayoutMaterials={sheetLayoutMaterials} onWorkspaceState={setWorkspaceState} /></>
      : <StandaloneGablePreview organizationId={organizationId} showBackNavigation={false} onWorkspaceState={setWorkspaceState} onChangeRoofType={() => void changeType()} />)}
    {selected !== "gable" && <MultiRoofCalculatorForm key={selected} type={selected} organizationId={organizationId} projectId={projectId} onChangeRoofType={() => void changeType()} onWorkspaceState={setWorkspaceState} />}
  </div>;
}
