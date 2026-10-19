import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/infrastructure/supabase/database";
import { getSupabasePublicEnv, SupabaseConfigurationError } from "@/infrastructure/supabase/env";

const protectedPaths = ["/", "/demo"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function safeReturnTo(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

function copyResponseState(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => target.cookies.set(name, value, options));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

export async function updateSession(request: NextRequest) {
  let env: ReturnType<typeof getSupabasePublicEnv>;
  try {
    env = getSupabasePublicEnv();
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ error: "A Supabase helyi konfigurációja hiányzik." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const pathname = request.nextUrl.pathname;

  if (!claims && isProtectedPath(pathname)) {
    const loginUrl = new URL("/bejelentkezes", request.url);
    loginUrl.searchParams.set("returnTo", safeReturnTo(request));
    return copyResponseState(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (claims && pathname === "/bejelentkezes") {
    return copyResponseState(supabaseResponse, NextResponse.redirect(new URL("/", request.url)));
  }

  if (isProtectedPath(pathname)) supabaseResponse.headers.set("Cache-Control", "private, no-store");
  return supabaseResponse;
}
