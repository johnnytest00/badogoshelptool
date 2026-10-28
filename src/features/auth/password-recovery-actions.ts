"use server";

import { cookies } from "next/headers";
import { accountPasswordSchema, getAccountAuthErrorMessage } from "./account-management";
import { isValidRecoverySession, PASSWORD_RECOVERY_COOKIE } from "./password-recovery";
import { createClient } from "@/infrastructure/supabase/server";

export async function finishPasswordRecovery(input: unknown) {
  const parsed = accountPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ellenőrizd az új jelszót." };

  const cookieStore = await cookies();
  if (!isValidRecoverySession(cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value, true)) {
    return { error: "A helyreállító hivatkozás lejárt vagy már felhasználták. Kérj új helyreállító e-mailt." };
  }

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return { error: "A helyreállító hivatkozás lejárt. Kérj újat, majd nyisd meg az e-mailből." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: getAccountAuthErrorMessage(error) };

    cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" }).catch(() => ({ error: new Error("signout-failed") }));
    if (signOutError) return { success: true, warning: "A jelszó módosult. Jelentkezz ki, majd lépj be az új jelszóval." };
    return { success: true };
  } catch {
    return { error: "A hitelesítési szolgáltatás nem érhető el. Próbáld újra." };
  }
}
