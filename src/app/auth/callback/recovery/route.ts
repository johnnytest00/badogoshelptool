import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import { PASSWORD_RECOVERY_COOKIE, isPasswordRecoveryCallback } from "@/features/auth/password-recovery";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = new URL("/jelszo-visszaallitas", request.url);

  if (!isPasswordRecoveryCallback(code)) {
    target.searchParams.set("hiba", "link");
    return NextResponse.redirect(target);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      target.searchParams.set("hiba", "link");
      return NextResponse.redirect(target);
    }

    const response = NextResponse.redirect(target);
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    return response;
  } catch {
    target.searchParams.set("hiba", "link");
    return NextResponse.redirect(target);
  }
}
