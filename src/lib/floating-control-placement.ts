export type ScreenRect = Readonly<{ left: number; right: number; top: number; bottom: number }>;

export function rectanglesOverlap(first: ScreenRect, second: ScreenRect): boolean {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}
