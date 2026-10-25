export type SupabaseReadFailure = "access_denied" | "unavailable";

export class SupabaseReadError extends Error {
  constructor(message: string, readonly failure: SupabaseReadFailure) {
    super(message);
    this.name = "SupabaseReadError";
  }
}

function isAccessDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; status?: unknown };
  return Number(value.status) === 401 || Number(value.status) === 403
    || ["42501", "PGRST301", "PGRST302"].includes(String(value.code));
}

export async function readSupabase<T>(query: PromiseLike<{ data: T; error: unknown }>, message: string) {
  try {
    const result = await query;
    if (result.error) throw new SupabaseReadError(message, isAccessDenied(result.error) ? "access_denied" : "unavailable");
    return result;
  } catch (error) {
    if (error instanceof SupabaseReadError) throw error;
    throw new SupabaseReadError(message, "unavailable");
  }
}
