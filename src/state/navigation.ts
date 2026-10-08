import { t } from "../i18n";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
export const PANELS = [
  {
    id: "project",
    get label() {
      return t("m_81a8b56e69");
    },
    key: "C",
  },
  {
    id: "ponds",
    get label() {
      return t("m_753eaba445");
    },
    key: "B",
  },
  {
    id: "logistics",
    get label() {
      return t("m_e68fd7eca1");
    },
    key: "L",
  },
  {
    id: "finance",
    get label() {
      return t("m_614e14f791");
    },
    key: "F",
  },
  {
    id: "journal",
    get label() {
      return t("m_43b7c75d56");
    },
    key: "J",
  },
  {
    id: "guide",
    get label() {
      return t("m_8dd65d0952");
    },
    key: "G",
  },
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
