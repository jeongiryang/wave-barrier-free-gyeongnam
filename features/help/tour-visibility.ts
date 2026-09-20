/** Closed disclosures can retain layout rectangles while their contents are hidden. */
export function isTourTargetVisible(target: HTMLElement): boolean {
  if (!target.getClientRects().length || getComputedStyle(target).visibility === 'hidden') return false;
  for (let parent = target.parentElement; parent; parent = parent.parentElement) {
    if (parent instanceof HTMLDetailsElement && !parent.open && !parent.querySelector(':scope > summary')?.contains(target)) return false;
  }
  return true;
}
