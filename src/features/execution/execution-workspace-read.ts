import { SupabaseReadError } from "@/infrastructure/supabase/read-error";

export type ExecutionWorkspaceSection<T> =
  | { status: "loaded"; data: T }
  | { status: "unavailable" | "access_denied" };

export async function loadOptionalExecutionSection<T>(read: () => Promise<T>): Promise<ExecutionWorkspaceSection<T>> {
  try {
    return { status: "loaded", data: await read() };
  } catch (error) {
    if (error instanceof SupabaseReadError) return { status: error.failure };
    throw error;
  }
}
