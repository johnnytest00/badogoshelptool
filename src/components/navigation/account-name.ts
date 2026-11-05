export function greetingName(displayName: string | null) {
  return displayName?.trim().split(/\s+/)[0] || null;
}

export function greetingLabel(displayName: string | null) {
  const name = greetingName(displayName);
  return name ? `Szia ${name}!` : "Szia!";
}
