export type ProfileCatalogCandidate = {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  category: string;
  status: string;
  purchasingUnit: string;
  thicknessMm: number | null;
  materialSpec: string | null;
  provenance: string;
  sourceName: string | null;
};

export type ProfileMaterialMatch = "TECHNICALLY_MATCHED_PARAMETERS" | "UNRESOLVED" | "INCOMPATIBLE";

export function matchProfileMaterial(candidate: ProfileCatalogCandidate | null, materialSpec: string, thicknessMm: number): ProfileMaterialMatch {
  if (!candidate) return "UNRESOLVED";
  if (candidate.category !== "sheet_metal" || candidate.status !== "active") return "INCOMPATIBLE";
  if (!candidate.materialSpec?.trim() || !candidate.sourceName?.trim() || candidate.thicknessMm === null) return "UNRESOLVED";
  if (candidate.purchasingUnit !== "square_meter") return "INCOMPATIBLE";
  if (candidate.materialSpec !== materialSpec.trim() || candidate.thicknessMm !== thicknessMm) return "INCOMPATIBLE";
  return "TECHNICALLY_MATCHED_PARAMETERS";
}
