import { useCallback, useLayoutEffect, useRef, useState } from "react";

export const PANELS = [
  { id: "project", label: "Construire", key: "C" },
  { id: "ponds", label: "Bassins", key: "B" },
  { id: "logistics", label: "Logistique", key: "L" },
  { id: "finance", label: "Finances", key: "F" },
  { id: "journal", label: "Journal", key: "J" },
  { id: "guide", label: "Guide", key: "G" },
] as const;
export type PanelId = (typeof PANELS)[number]["id"];

/** Presentation state only: never persisted in the biological save. */
export function usePanelNavigation() {
  const [panel, setPanel] = useState<PanelId | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const restore = useRef(false);
  const open = useCallback((id: PanelId) => {
    restore.current = false;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPanel(id);
  }, []);
  const close = useCallback(() => {
    restore.current = true;
    setPanel(null);
  }, []);
  // Restore during the closing commit, before another input can open a new panel.
  // A deferred RAF could steal the focus from the next navigation command.
  useLayoutEffect(() => {
    if (panel !== null || !restore.current) return;
    restore.current = false;
    const target = opener.current;
    const available =
      target?.isConnected &&
      !target.closest('[inert],[aria-hidden="true"]') &&
      target.getClientRects().length > 0 &&
      getComputedStyle(target).visibility !== "hidden";
    if (available) target.focus({ preventScroll: true });
    // Projected labels can remain hidden until the next rendered frame after
    // a drawer closes. Keep keyboard navigation in a visible control.
    if (!available || document.activeElement !== target)
      document
        .querySelector<HTMLButtonElement>(".game-dock button")
        ?.focus({ preventScroll: true });
  }, [panel]);
  const toggle = useCallback(
    (id: PanelId) => {
      if (panel === id) close();
      else open(id);
    },
    [panel, open, close],
  );
  return { panel, open, close, toggle };
}
