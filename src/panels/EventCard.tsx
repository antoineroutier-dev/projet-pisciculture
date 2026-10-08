import { t, displayText } from "../i18n";
import {
  Building2,
  Fish,
  PackageCheck,
  Banknote,
  Award,
  Droplets,
  ArrowRight,
} from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import type { GameEvent } from "../state/gameEvents";
import { formatEngineText } from "../ui/format";
import { DialogFeedback } from "../world/FeedbackLayer";
export function EventCard({
  event,
  close,
  act,
  inspect,
}: {
  event: GameEvent;
  close: () => void;
  act: () => void;
  inspect: () => void;
}) {
  const Icon = {
    build: Building2,
    fish: Fish,
    harvest: PackageCheck,
    payment: Banknote,
    award: Award,
    water: Droplets,
  }[event.illustration];
  return (
    <Dialog title={displayText(event.title)} close={close}>
      <DialogFeedback />
      <div
        className={`event-card event-${event.kind}`}
        data-testid="event-card"
        data-event={event.id}
      >
        <div className="event-illustration" aria-hidden="true">
          <svg viewBox="0 0 360 112">
            <path d="M0 80 Q70 24 130 74 T270 55 T360 70 V112 H0Z" />
            <path d="M0 96 Q90 70 180 90 T360 88" />
            {event.kind === "celebration" &&
              Array.from({ length: 8 }, (_, i) => (
                <ellipse
                  key={i}
                  className="event-leaf"
                  cx={24 + i * 44}
                  cy={16 + (i % 3) * 16}
                  rx="3"
                  ry="6"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              ))}
          </svg>
          <Icon size={48} />
        </div>
        <p className="event-kind">
          {displayText(
            event.kind === "celebration"
              ? t("m_4af9fa9c28")
              : event.kind === "alert"
                ? t("m_5bdd8ca0d4")
                : t("m_48e13afba5"),
          )}
        </p>
        <p>{displayText(event.text)}</p>
        <div className="event-actions">
          {(event.action || (event.task && !event.task.wait)) && (
            <Button tone="primary" onClick={act}>
              {displayText(
                event.actionLabel || formatEngineText(event.task!.label),
              )}
              <ArrowRight size={16} />
            </Button>
          )}
          {event.pondId && event.task?.target !== "ponds" && (
            <Button tone="secondary" onClick={inspect}>
              {t("m_154ef6e97d")}
            </Button>
          )}
          <Button
            tone={
              event.action || (event.task && !event.task.wait)
                ? "secondary"
                : "primary"
            }
            onClick={close}
          >
            {t("m_3bc3807f22")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
