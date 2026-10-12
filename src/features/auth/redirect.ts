export function getSafeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/bejelentkezes")) return "/";
  try {
    const target = new URL(value, "http://local.invalid");
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}
