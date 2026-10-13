export function warnBeforeUnloadIfDirty(dirty: boolean, event: Pick<BeforeUnloadEvent, "preventDefault" | "returnValue">) {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
}
