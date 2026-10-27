type SourceOption = Readonly<{ value: string; label: string }>;

export function QuotationSourceSelector({ organizationId, materialRevisions, calculationRevisions, selectedMaterial, selectedCalculation }: Readonly<{
  organizationId: string;
  materialRevisions: readonly SourceOption[];
  calculationRevisions: readonly SourceOption[];
  selectedMaterial: string;
  selectedCalculation: string;
}>) {
  return <section className="glass-bubble quotation-source-selector" aria-labelledby="quotation-source-heading">
    <h2 id="quotation-source-heading">Ajánlati források</h2>
    <p>Válassz mentett revíziókat. Mindkét forrás egyszerre is megadható.</p>
    <form method="get" action="/ajanlatok/uj">
      <input type="hidden" name="organization" value={organizationId} />
      <label htmlFor="quotation-material-source">Anyaglista-revízió
        <select id="quotation-material-source" name="materialSource" defaultValue={selectedMaterial}>
          <option value="">Nincs anyaglista</option>
          {materialRevisions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label htmlFor="quotation-calculation-source">Kalkulációs revízió
        <select id="quotation-calculation-source" name="calculationSource" defaultValue={selectedCalculation}>
          <option value="">Nincs kalkuláció</option>
          {calculationRevisions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button className="secondary-button" type="submit">Források betöltése</button>
    </form>
  </section>;
}
