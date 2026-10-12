export class SupabaseConfigurationError extends Error {
  constructor() {
    super("A helyi Supabase konfiguráció hiányzik vagy érvénytelen.");
    this.name = "SupabaseConfigurationError";
  }
}

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) throw new SupabaseConfigurationError();

  try {
    const parsedUrl = new URL(url);
    if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error("Unsupported protocol");
  } catch {
    throw new SupabaseConfigurationError();
  }

  return { url, publishableKey } as const;
}
