export type ScreenRect = Readonly<{ left: number; right: number; top: number; bottom: number }>;

export function rectanglesOverlap(first: ScreenRect, second: ScreenRect): boolean {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

export type FloatingSide = "right" | "left";
export type FloatingPlacement = Readonly<{ side: FloatingSide; bottom: number }>;

function overlapArea(first: ScreenRect, second: ScreenRect): number {
  const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/**
 * Picks where a floating launcher sits inside the visual viewport. `bottom`/`margin` are distances from the viewport's
 * bottom/side edge. The default slot wins whenever it is free; otherwise the current placement is kept while it is free (no jumping
 * on scroll), else the nearest free slot (same side raised, then the opposite side) wins; if nothing is free the least-overlapping slot is used — the
 * control is never hidden.
 */
export function chooseFloatingPlacement({ viewport, size, margin, baseBottom, obstacles, current }: Readonly<{
  viewport: Readonly<{ left: number; top: number; width: number; height: number }>;
  size: number;
  margin: number;
  baseBottom: number;
  obstacles: readonly ScreenRect[];
  current?: FloatingPlacement;
}>): FloatingPlacement {
  const step = size + 8;
  const maxBottom = Math.max(baseBottom, viewport.height * 0.7 - size);
  const candidates: FloatingPlacement[] = [];
  for (let bottom = baseBottom; bottom <= maxBottom; bottom += step) candidates.push({ side: "right", bottom }, { side: "left", bottom });
  const rectFor = (placement: FloatingPlacement): ScreenRect => {
    const left = placement.side === "right" ? viewport.left + viewport.width - margin - size : viewport.left + margin;
    const bottom = viewport.top + viewport.height - placement.bottom;
    return { left, right: left + size, top: bottom - size, bottom };
  };
  const cost = (placement: FloatingPlacement) => obstacles.reduce((sum, obstacle) => sum + overlapArea(rectFor(placement), obstacle), 0);
  if (candidates[0] && cost(candidates[0]) === 0) return candidates[0];
  if (current && cost(current) === 0) return current;
  let best = candidates[0];
  let bestCost = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const value = cost(candidate);
    if (value === 0) return candidate;
    if (value < bestCost) { best = candidate; bestCost = value; }
  }
  return best;
}
