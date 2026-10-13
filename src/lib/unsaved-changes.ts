export function warnBeforeUnloadIfDirty(dirty: boolean, event: Pick<BeforeUnloadEvent, "preventDefault" | "returnValue">) {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
}

export function guardUnsavedNavigation(
  event: Pick<MouseEvent, "preventDefault">,
  options: { dirty: boolean; pending: boolean; confirmDiscard: () => boolean; onDiscard: () => void },
) {
  if (options.pending) { event.preventDefault(); return false; }
  if (!options.dirty) return true;
  if (!options.confirmDiscard()) { event.preventDefault(); return false; }
  options.onDiscard();
  return true;
}
