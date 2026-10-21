export type ScreenRect = Readonly<{ left: number; right: number; top: number; bottom: number }>;

export function rectanglesOverlap(first: ScreenRect, second: ScreenRect): boolean {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

export type FloatingSide = "right" | "left";
/** `docked`: nem maradt szabad hely, ezért a vezérlő félig a képernyő szélére húzódik, hogy ne takarjon tartalmat. */
export type FloatingPlacement = Readonly<{ side: FloatingSide; bottom: number; docked?: boolean }>;

function overlapArea(first: ScreenRect, second: ScreenRect): number {
  const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * Picks where a floating launcher sits inside the visual viewport. `bottom`/`margin` are distances from the viewport's
 * bottom/side edge. The default slot wins whenever it is free; otherwise the current placement is kept while it is free (no jumping
 * on scroll), else the nearest free slot (same side raised, then the opposite side) wins.
 *
 * When no full-size slot is free — a dense form on a short phone screen — the launcher docks: it keeps only
 * `dockedWidth` of itself inside the viewport and slides the rest past the edge, so it sits in the page gutter instead of
 * covering an input or a button. It never disappears, because in a calculator this is the only way to reach scaling.
 */
export function chooseFloatingPlacement({ viewport, size, margin, baseBottom, obstacles, current, dockedWidth }: Readonly<{
  viewport: Readonly<{ left: number; top: number; width: number; height: number }>;
  size: number;
  margin: number;
  baseBottom: number;
  obstacles: readonly ScreenRect[];
  current?: FloatingPlacement;
  dockedWidth?: number;
}>): FloatingPlacement {
  const step = size + 8;
  const maxBottom = Math.max(baseBottom, viewport.height * 0.7 - size);
  const slots: Readonly<{ side: FloatingSide; bottom: number }>[] = [];
  for (let bottom = baseBottom; bottom <= maxBottom; bottom += step) slots.push({ side: "right", bottom }, { side: "left", bottom });

  const rectFor = (placement: Readonly<{ side: FloatingSide; bottom: number }>, width: number): ScreenRect => {
    const left = placement.side === "right" ? viewport.left + viewport.width - margin - width : viewport.left + margin;
    const bottom = viewport.top + viewport.height - placement.bottom;
    return { left, right: left + width, top: bottom - size, bottom };
  };
  const costWith = (placement: Readonly<{ side: FloatingSide; bottom: number }>, width: number) =>
    obstacles.reduce((sum, obstacle) => sum + overlapArea(rectFor(placement, width), obstacle), 0);

  if (slots[0] && costWith(slots[0], size) === 0) return slots[0];
  if (current && !current.docked && costWith(current, size) === 0) return current;
  for (const slot of slots) if (costWith(slot, size) === 0) return slot;

  // Nincs szabad teljes méretű hely: a keskenyebb, szélre húzott változattal próbálkozunk.
  const narrow = Math.max(1, Math.min(dockedWidth ?? Math.round(size / 2), size));
  if (current?.docked && costWith(current, narrow) === 0) return current;
  for (const slot of slots) if (costWith(slot, narrow) === 0) return { ...slot, docked: true };

  let best = slots[0] ?? { side: "right" as FloatingSide, bottom: baseBottom };
  let bestCost = Number.POSITIVE_INFINITY;
  for (const slot of slots) {
    const value = costWith(slot, narrow);
    if (value < bestCost) { best = slot; bestCost = value; }
  }
  return { ...best, docked: true };
}
