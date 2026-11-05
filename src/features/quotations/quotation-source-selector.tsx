"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, Layers3, X } from "lucide-react";

type SourceOption = Readonly<{ value: string; label: string }>;

export function QuotationSourceSelector({ organizationId, materialRevisions, calculationRevisions, selectedMaterial, selectedCalculation }: Readonly<{
  organizationId: string;
  materialRevisions: readonly SourceOption[];
  calculationRevisions: readonly SourceOption[];
  selectedMaterial: string;
  selectedCalculation: string;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const selectedMaterialLabel = materialRevisions.find((option) => option.value === selectedMaterial)?.label;
  const selectedCalculationLabel = calculationRevisions.find((option) => option.value === selectedCalculation)?.label;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <section className="quotation-source-selector" aria-labelledby="quotation-source-heading">
    <div className="quotation-source-summary">
      <div className="quotation-source-summary-copy">
        <span className="quotation-source-icon"><Layers3 aria-hidden="true" size={19} /></span>
        <div><h2 id="quotation-source-heading">Árajánlati források</h2><p>{selectedMaterialLabel || selectedCalculationLabel ? "A kiválasztott, mentett revíziókból indul az ajánlat." : "Opcionális · üres ajánlatot is készíthetsz."}</p></div>
      </div>
      <div className="quotation-source-summary-actions">
        <div className="quotation-source-selected" aria-live="polite">
          {selectedMaterialLabel && <span><Layers3 aria-hidden="true" size={14} />{selectedMaterialLabel}</span>}
          {selectedCalculationLabel && <span><Calculator aria-hidden="true" size={14} />{selectedCalculationLabel}</span>}
          {!selectedMaterialLabel && !selectedCalculationLabel && <span className="is-empty">Nincs forrás kiválasztva</span>}
        </div>
        <button className="secondary-button quotation-source-open" type="button" onClick={() => setOpen(true)}>Források kiválasztása</button>
      </div>
    </div>
    <dialog ref={dialogRef} className="glass-confirmation-dialog quotation-source-dialog" aria-labelledby="quotation-source-dialog-title" onCancel={(event) => { event.preventDefault(); setOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="association-dialog-content">
        <div className="section-heading quotation-source-dialog-heading"><div><p className="section-eyebrow">Opcionális ajánlati indulás</p><h2 id="quotation-source-dialog-title">Források kiválasztása</h2><p>Válassz ki egy vagy mindkét mentett revíziót.</p></div><button type="button" className="icon-button" aria-label="Ablak bezárása" onClick={() => setOpen(false)}><X aria-hidden="true" size={19} /></button></div>
        <form method="get" action="/ajanlatok/uj" className="quotation-source-form">
          <input type="hidden" name="organization" value={organizationId} />
          <label htmlFor="quotation-material-source"><span><Layers3 aria-hidden="true" size={16} />Anyaglista-revízió</span>
            <select id="quotation-material-source" name="materialSource" defaultValue={selectedMaterial}>
              <option value="">Nincs anyaglista</option>
              {materialRevisions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <small>Az ajánlat az anyaglista kiválasztott, rögzített verziójából készül.</small>
          </label>
          <label htmlFor="quotation-calculation-source"><span><Calculator aria-hidden="true" size={16} />Kalkulációs revízió</span>
            <select id="quotation-calculation-source" name="calculationSource" defaultValue={selectedCalculation}>
              <option value="">Nincs kalkuláció</option>
              {calculationRevisions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <small>A mentett mennyiségek átvétel előtt még szerkeszthetők.</small>
          </label>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Mégse</button><button className="primary-button" type="submit">Források betöltése</button></div>
        </form>
      </div>
    </dialog>
  </section>;
}
