export type ViewportMenuRect = Readonly<{ left: number; top: number; width: number; height: number }>;
export type ViewportMenuAnchor = Readonly<{ left: number; right: number; top: number; bottom: number }>;
export type ViewportMenuPlacement = Readonly<{ left: number; top: number; maxWidth: number; maxHeight: number; side: "below" | "above" }>;
export type ViewportMenuInsets = Readonly<{ left: number; right: number; top: number; bottom: number }>;

export function placeAnchoredMenu(
  anchor: ViewportMenuAnchor,
  menu: Pick<ViewportMenuRect, "width" | "height">,
  viewport: ViewportMenuRect,
  insets: ViewportMenuInsets = { left: 0, right: 0, top: 0, bottom: 0 },
  gap = 12,
): ViewportMenuPlacement {
  const minLeft = viewport.left + Math.max(0, insets.left) + gap;
  const maxRight = viewport.left + viewport.width - Math.max(0, insets.right) - gap;
  const maxWidth = Math.max(0, maxRight - minLeft);
  const minTop = viewport.top + Math.max(0, insets.top) + gap;
  const maxBottom = viewport.top + viewport.height - Math.max(0, insets.bottom) - gap;
  const belowTop = anchor.bottom + gap;
  const belowSpace = Math.max(0, maxBottom - belowTop);
  const aboveSpace = Math.max(0, anchor.top - gap - minTop);
  const side = belowSpace >= menu.height || belowSpace >= aboveSpace ? "below" : "above";
  const availableHeight = side === "below" ? belowSpace : aboveSpace;
  const maxHeight = Math.max(0, Math.min(menu.height, availableHeight));
  const left = Math.max(minLeft, Math.min(anchor.right - menu.width, maxRight - menu.width));
  const top = side === "below"
    ? Math.min(belowTop, maxBottom - maxHeight)
    : Math.max(minTop, anchor.top - gap - maxHeight);
  return { left, top, maxWidth, maxHeight, side };
}
