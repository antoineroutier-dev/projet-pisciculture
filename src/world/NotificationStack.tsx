import { useEffect, useState } from "react";
import { AlertTriangle, Truck, Hammer, X } from "lucide-react";
import type { Game } from "../game";
import { subscribeLife } from "./lifeBus";
import { criticalNotices, lifeNotice, type WorldNotice } from "./notifications";
import type { WorldTarget } from "./selection";
export function NotificationStack({
  game,
  inspect,
  journal,
}: {
  game: Game;
  inspect: (target: WorldTarget) => void;
  journal: () => void;
}) {
  const [recent, setRecent] = useState<WorldNotice[]>([]);
  useEffect(
    () =>
      subscribeLife((message) => {
        if (message.type === "reset") {
          setRecent([]);
          return;
        }
        const next = message.events
          .map((e) => lifeNotice(e, Date.now()))
          .filter((n): n is WorldNotice => !!n);
        if (next.length)
          setRecent((old) =>
            [
              ...next,
              ...old.filter((n) => !next.some((v) => v.id === n.id)),
            ].slice(0, 3),
          );
      }),
    [],
  );
  useEffect(() => {
    if (!recent.length) return;
    const timeout = setTimeout(
      () => setRecent((old) => old.filter((n) => (n.until ?? 0) > Date.now())),
      Math.max(0, Math.min(...recent.map((n) => n.until!)) - Date.now()) + 20,
    );
    return () => clearTimeout(timeout);
  }, [recent]);
  const visible = [...criticalNotices(game), ...recent].slice(0, 3);
  if (!visible.length) return null;
  return (
    <aside className="notification-stack" aria-label="Notifications du terrain">
      <ol>
        {visible.map((n) => (
          <li key={n.id} data-kind={n.kind}>
            <button
              className="notification-target"
              onClick={() => (n.target ? inspect(n.target) : journal())}
              title={n.text}
            >
              {n.kind === "critical" ? (
                <AlertTriangle size={18} />
              ) : n.kind === "truck" ? (
                <Truck size={18} />
              ) : (
                <Hammer size={18} />
              )}
              <span>{n.text}</span>
            </button>
            {n.kind !== "critical" && (
              <button
                className="notification-close"
                aria-label={`Fermer : ${n.text}`}
                onClick={() =>
                  setRecent((old) => old.filter((v) => v.id !== n.id))
                }
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
