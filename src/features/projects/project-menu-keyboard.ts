type EscapeKeyEvent = Readonly<{ key: string; preventDefault: () => void; stopPropagation?: () => void }>;

export function closeMenuOnEscape(event: EscapeKeyEvent, isOpen: boolean, close: () => void): boolean {
  if (!isOpen || event.key !== "Escape") return false;
  event.preventDefault();
  event.stopPropagation?.();
  close();
  return true;
}
