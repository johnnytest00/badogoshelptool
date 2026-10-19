import type { Database as Generated, Json } from "./database.types";

export type { Json };

/**
 * `database.types.ts` is pure `npm run db:types` output and is never edited by hand. The generator marks every RPC
 * argument non-null, so the arguments that the SQL functions deliberately accept as NULL are declared here, once.
 * Keep this list in sync with the SQL; TypeScript call sites fail to compile if a listed function or argument disappears.
 */
type NullableRpcArgs = {
  create_field_survey_followup: "p_project_id";
  save_material_preparation_revision: "p_list_id";
  save_gable_trapezoidal_covering_calculation: "p_project_id" | "p_roof_model_id" | "p_source_roof_revision_id";
};

type PublicFunctions = Generated["public"]["Functions"];
type WithNullableArgs<F, K extends PropertyKey> = F extends { Args: infer A }
  ? Omit<F, "Args"> & { Args: { [P in keyof A]: P extends K ? A[P] | null : A[P] } }
  : F;

export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Functions"> & {
    Functions: { [N in keyof PublicFunctions]: N extends keyof NullableRpcArgs ? WithNullableArgs<PublicFunctions[N], NullableRpcArgs[N]> : PublicFunctions[N] };
  };
};
