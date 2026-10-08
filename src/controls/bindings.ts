import { t } from "../i18n";
export const CONTROL_ACTIONS = [
  {
    id: "project",
    get label() {
      return t("m_81a8b56e69");
    },
    key: "Alt+C",
  },
  {
    id: "ponds",
    get label() {
      return t("m_753eaba445");
    },
    key: "Alt+B",
  },
  {
    id: "logistics",
    get label() {
      return t("m_e68fd7eca1");
    },
    key: "Alt+L",
  },
  {
    id: "finance",
    get label() {
      return t("m_614e14f791");
    },
    key: "Alt+F",
  },
  {
    id: "journal",
    get label() {
      return t("m_43b7c75d56");
    },
    key: "Alt+J",
  },
  {
    id: "guide",
    get label() {
      return t("m_8dd65d0952");
    },
    key: "Alt+G",
  },
  {
    id: "toggle",
    get label() {
      return t("m_b6e9156456");
    },
    key: "Space",
  },
  {
    id: "pause",
    get label() {
      return t("m_42dd586c06");
    },
    key: "1",
  },
  {
    id: "speed1",
    get label() {
      return t("m_66efc5b45b");
    },
    key: "2",
  },
  {
    id: "speed2",
    get label() {
      return t("m_6f0764c86d");
    },
    key: "3",
  },
  {
    id: "speed4",
    get label() {
      return t("m_02d704f0a0");
    },
    key: "4",
  },
  {
    id: "speed8",
    get label() {
      return t("m_1ed4192dbb");
    },
    key: "5",
  },
  {
    id: "left",
    get label() {
      return t("m_e121ef9fe0");
    },
    key: "Q",
  },
  {
    id: "right",
    get label() {
      return t("m_207264ea07");
    },
    key: "E",
  },
  {
    id: "zoomIn",
    get label() {
      return t("m_00ed213948");
    },
    key: "+",
  },
  {
    id: "zoomOut",
    get label() {
      return t("m_fa06cdd64d");
    },
    key: "-",
  },
  {
    id: "reset",
    get label() {
      return t("m_ca542c7082");
    },
    key: "R",
  },
] as const;
export type ControlAction = (typeof CONTROL_ACTIONS)[number]["id"];
export type Bindings = Record<ControlAction, string>;
export const DEFAULT_BINDINGS = Object.fromEntries(
  CONTROL_ACTIONS.map((a) => [a.id, a.key]),
) as Bindings;
type KeyEvent = Pick<
  KeyboardEvent,
  "key" | "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;
/** A deliberately small grammar keeps browser and focus-navigation keys reserved. */
export function normalizeBinding(value: string): string | null {
  let s = value.trim();
  const alt = /^Alt\+/i.test(s);
  if (alt) s = s.slice(4);
  if (s.toLowerCase() === "space") s = "Space";
  else if (s === "=") s = "+";
  else if (/^[a-z0-9+\-]$/i.test(s)) s = s.toUpperCase();
  else return null;
  if (alt && s === "Space") return null;
  return `${alt ? "Alt+" : ""}${s}`;
}
export function bindingFromEvent(e: KeyEvent): string | null {
  if (e.ctrlKey || e.metaKey || (e.shiftKey && e.key !== "+")) return null;
  const key = e.code === "Space" || e.key === " " ? "Space" : e.key;
  return normalizeBinding(`${e.altKey ? "Alt+" : ""}${key}`);
}
export function bindingError(
  bindings: Bindings,
  action: ControlAction,
  value: string,
): string {
  const key = normalizeBinding(value);
  if (!key) return t("m_b20080f926");
  const other = CONTROL_ACTIONS.find(
    (a) => a.id !== action && bindings[a.id] === key,
  );
  return other ? t("m_835acfa8a7", other.label) : "";
}
export function parseBindings(input: unknown): Bindings {
  if (!input || typeof input !== "object") return { ...DEFAULT_BINDINGS };
  const candidate = { ...DEFAULT_BINDINGS };
  for (const a of CONTROL_ACTIONS) {
    const raw = (input as Record<string, unknown>)[a.id];
    if (raw !== undefined) {
      const key = typeof raw === "string" && normalizeBinding(raw);
      if (!key) return { ...DEFAULT_BINDINGS };
      candidate[a.id] = key;
    }
  }
  // Restore the complete map if damaged: no silently unreachable action.
  return new Set(Object.values(candidate)).size === CONTROL_ACTIONS.length
    ? candidate
    : { ...DEFAULT_BINDINGS };
}
export function editableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      'input,select,textarea,[contenteditable="true"],[role="slider"]',
    )
  );
}
export function matchControl(
  event: KeyboardEvent,
  bindings: Bindings,
): ControlAction | undefined {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    editableTarget(event.target)
  )
    return;
  const key = bindingFromEvent(event);
  // Space always retains its native activation on buttons and disclosure widgets.
  if (
    key === "Space" &&
    event.target instanceof Element &&
    event.target.closest("button,summary")
  )
    return;
  return CONTROL_ACTIONS.find((a) => bindings[a.id] === key)?.id;
}
export const bindingLabel = (value: string) =>
  value.replace("Space", t("controls.space"));
