export const PASSWORD_RECOVERY_COOKIE = "tetopro-password-recovery";

export function getPasswordRecoveryRedirectTo(origin: string) {
  return new URL("/auth/callback/recovery", origin).toString();
}

export function isPasswordRecoveryCallback(code: string | null): code is string {
  return Boolean(code);
}

export function isValidRecoverySession(marker: string | undefined, hasUser: boolean) {
  return marker === "1" && hasUser;
}
