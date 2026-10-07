import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Check, AlertTriangle, Clock3 } from "lucide-react";
import { number } from "../game";
import { formatMoney } from "../ui/format";
import {
  feedbackPhase,
  feedbackStore,
  clearFeedback,
  type Feedback,
} from "../state/feedback";
function useMobile() {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 680px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 680px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return mobile;
}
function Delta({
  event,
  inline = false,
  mobile = false,
  inDialog = false,
}: {
  event: Feedback;
  inline?: boolean;
  mobile?: boolean;
  inDialog?: boolean;
}) {
  const [top, setTop] = useState(event.point.y);
  useLayoutEffect(() => {
    if (mobile && !inline) {
      const goal = document.querySelector(".goal-hud")?.getBoundingClientRect();
      if (goal) setTop(Math.max(event.point.y, goal.bottom + 36));
    }
  }, [event, inline, mobile]);
  useLayoutEffect(() => {
    if (inDialog || !document.querySelector(".modal-backdrop"))
      feedbackPhase(event, event.pending ? "visual" : "result-visual", {
        connected: true,
        inline,
      });
  }, [event, inline, inDialog]);
  const hasMoney = Math.abs(event.money) >= 0.005,
    hasFood = Math.abs(event.food) >= 0.05;
  return (
    <div
      className={`world-feedback ${inline ? "inline-feedback" : ""} ${event.pending ? "pending" : event.ok ? "positive" : "negative"}`}
      data-feedback-id={event.id}
      data-pond-source={event.pondId}
      style={inline ? undefined : { left: event.point.x, top }}
      aria-hidden="true"
    >
      {event.pending ? (
        <Clock3 size={16} />
      ) : event.ok ? (
        <Check size={16} />
      ) : (
        <AlertTriangle size={16} />
      )}
      <span>
        {hasMoney && (
          <strong
            className={event.money < 0 ? "delta-negative" : "delta-positive"}
          >
            {event.money > 0 ? "+" : ""}
            {formatMoney(event.money)}
          </strong>
        )}
        {hasFood && (
          <strong>
            {event.food > 0 ? "+" : ""}
            {number(event.food, 1)} kg
          </strong>
        )}
        {!hasMoney && !hasFood && (
          <strong>
            {event.pending
              ? "En cours…"
              : event.ok
                ? "Action effectuée"
                : "À vérifier"}
          </strong>
        )}
      </span>
    </div>
  );
}
export function InlineFeedback() {
  const mobile = useMobile(),
    events = useSyncExternalStore(
      feedbackStore.subscribe,
      feedbackStore.getSnapshot,
    ),
    event = events.at(-1);
  return mobile && event ? <Delta event={event} inline /> : null;
}
export function FeedbackLayer({ panelOpen }: { panelOpen: boolean }) {
  const mobile = useMobile(),
    events = useSyncExternalStore(
      feedbackStore.subscribe,
      feedbackStore.getSnapshot,
    );
  useEffect(() => () => clearFeedback(), []);
  return (
    <div className="feedback-layer">
      <span className="sr-only" role="status">
        {events.at(-1)?.action === "day" ? events.at(-1)?.message : ""}
      </span>
      {!(mobile && panelOpen) &&
        events.map((event) => (
          <Delta key={event.id} event={event} mobile={mobile} />
        ))}
    </div>
  );
}

export function DialogFeedback() {
  const event = useSyncExternalStore(
    feedbackStore.subscribe,
    feedbackStore.getSnapshot,
  ).at(-1);
  return event?.pending ? <Delta event={event} inline inDialog /> : null;
}
