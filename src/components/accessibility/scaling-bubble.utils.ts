export function toggleBubble(open: boolean): boolean {
  return !open;
}

export function closeBubbleOnKey(open: boolean, key: string): boolean {
  return open && key === "Escape" ? false : open;
}

export function closeBubbleOnOutsideClick(open: boolean, isInside: boolean): boolean {
  return open && !isInside ? false : open;
}
