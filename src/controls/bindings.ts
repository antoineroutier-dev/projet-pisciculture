export const CONTROL_ACTIONS = [
  { id: "project", label: "Construire", key: "Alt+C" },
  { id: "ponds", label: "Bassins", key: "Alt+B" },
  { id: "logistics", label: "Logistique", key: "Alt+L" },
  { id: "finance", label: "Finances", key: "Alt+F" },
  { id: "journal", label: "Journal", key: "Alt+J" },
  { id: "guide", label: "Guide", key: "Alt+G" },
  { id: "toggle", label: "Pause / reprendre", key: "Space" },
  { id: "pause", label: "Mettre en pause", key: "1" },
  { id: "speed1", label: "Vitesse ×1", key: "2" },
  { id: "speed2", label: "Vitesse ×2", key: "3" },
  { id: "speed4", label: "Vitesse ×4", key: "4" },
  { id: "speed8", label: "Vitesse ×8", key: "5" },
  { id: "left", label: "Tourner à gauche", key: "Q" },
  { id: "right", label: "Tourner à droite", key: "E" },
  { id: "zoomIn", label: "Rapprocher", key: "+" },
  { id: "zoomOut", label: "Éloigner", key: "-" },
  { id: "reset", label: "Recentrer la caméra", key: "R" },
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
  if (!key)
    return "Choisissez une lettre, un chiffre, Espace, + ou −, avec Alt si besoin. Les touches de navigation restent réservées.";
  const other = CONTROL_ACTIONS.find(
    (a) => a.id !== action && bindings[a.id] === key,
  );
  return other ? `Ce raccourci sert déjà à « ${other.label} ».` : "";
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
export const bindingLabel = (value: string) => value.replace("Space", "Espace");
