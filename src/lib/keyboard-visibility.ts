export type FocusedElementBounds = Readonly<{ top: number; bottom: number }>;
export type VisualViewportBounds = Readonly<{ top: number; height: number }>;

export function focusedElementNeedsReveal(element: FocusedElementBounds, viewport: VisualViewportBounds, margin = 24): boolean {
  return element.top < viewport.top + margin || element.bottom > viewport.top + viewport.height - margin;
}
