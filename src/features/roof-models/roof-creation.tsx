"use client";

import { useState } from "react";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";
import type { SheetLayoutMaterialOption } from "./sheet-layout-data";
import { RoofTypeSelector } from "./roof-type-selector";
import { GableRoofCalculatorForm } from "./gable-roof-form";
import { StandaloneGablePreview } from "./standalone-gable-preview";
import { MultiRoofCalculatorForm } from "./multi-roof-form";

export function RoofCreation({ organizationId, projectId, sheetLayoutMaterials = [] }: Readonly<{ organizationId: string; projectId?: string; sheetLayoutMaterials?: readonly SheetLayoutMaterialOption[] }>) {
  const [selected, setSelected] = useState<RoofGeometryType | null>(null);
  const choose = (type: RoofGeometryType) => {
    if (selected && selected !== type && !window.confirm("A megadott, nem mentett tetőméretek elvesznek. Tetőformát váltasz?")) return;
    setSelected(type);
  };
  if (!selected) return <div className="roof-calculator"><RoofTypeSelector selected={null} onSelect={choose} /></div>;
  const changeType = () => {
    if (!window.confirm("A megadott, nem mentett tetőméretek elvesznek. Visszatérsz a tetőformákhoz?")) return;
    setSelected(null);
  };
  return <div className="roof-calculator">
    {selected === "gable" && (projectId
      ? <><button className="secondary-button" type="button" onClick={changeType}>← Tetőtípus kiválasztása</button><GableRoofCalculatorForm organizationId={organizationId} projectId={projectId} sheetLayoutMaterials={sheetLayoutMaterials} /></>
      : <StandaloneGablePreview organizationId={organizationId} onChangeRoofType={changeType} />)}
    {selected !== "gable" && <MultiRoofCalculatorForm key={selected} type={selected} organizationId={organizationId} projectId={projectId} onChangeRoofType={changeType} />}
  </div>;
}
