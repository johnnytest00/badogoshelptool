"use client";

export function QuotationDocumentActions({ pdfUrl }: Readonly<{ pdfUrl: string }>) {
  return <div className="quotation-document-actions" aria-label="PDF műveletek">
    <a className="secondary-button" href={pdfUrl} target="_blank" rel="noreferrer">PDF előnézet</a>
    <a className="secondary-button" href={pdfUrl} download>PDF letöltése</a>
    <a className="text-button" href={pdfUrl} target="_blank" rel="noreferrer">Nyomtatás</a>
  </div>;
}

