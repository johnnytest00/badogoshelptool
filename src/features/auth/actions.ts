"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/bejelentkezes");
}
