import { z } from "zod";

export const accountEmailSchema = z.object({
  email: z.string().trim().email("Adj meg érvényes e-mail-címet."),
});

export const accountPasswordSchema = z.object({
  password: z.string().min(1, "Add meg az új jelszót."),
  confirmation: z.string().min(1, "Erősítsd meg az új jelszót."),
  currentPassword: z.string().optional(),
}).refine((value) => value.password === value.confirmation, {
  message: "A két jelszó nem egyezik.",
  path: ["confirmation"],
});

export function getAccountAuthErrorMessage(error: Readonly<{ code?: string; status?: number }>): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit") return "Túl sok kérés érkezett. Várj egy kicsit, majd próbáld újra.";
  switch (error.code) {
    case "email_exists": return "Ez az e-mail-cím már egy másik fiókhoz tartozik.";
    case "validation_failed": return "A szolgáltatás elutasította az adatot. Ellenőrizd a formátumot.";
    case "weak_password": return "A jelszó nem felel meg a beállított biztonsági követelményeknek.";
    case "same_password": return "Az új jelszó egyezzen a jelenlegivel. Válassz másikat.";
    case "reauthentication_needed":
    case "reauthentication_not_valid": return "A biztonsági beállítások miatt jelentkezz be újra, majd ismételd meg a módosítást.";
    case "bad_code_verifier":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "otp_expired":
    case "token_expired": return "A megerősítő hivatkozás lejárt. Indíts új kérést.";
    case "session_not_found":
    case "user_not_found": return "A munkamenet lejárt. Jelentkezz be újra.";
    default: return "A fiókmódosítás nem sikerült. Ellenőrizd a kapcsolatot és próbáld újra.";
  }
}
