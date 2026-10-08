import { displayText } from "../i18n";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
export function Tooltip({
  text,
  children,
  focusable = false,
  className = "",
}: {
  text: string;
  children: (descriptionId: string | undefined) => ReactNode;
  focusable?: boolean;
  className?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const intentTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const show = () => {
    clearTimeout(leaveTimer.current);
    clearTimeout(intentTimer.current);
    setOpen(true);
  };
  // Hover opens only after the pointer actually moves and rests on the trigger,
  // so a panel appearing under a still cursor never covers what lies below.
  const intend = () => {
    clearTimeout(leaveTimer.current);
    if (open) return;
    clearTimeout(intentTimer.current);
    intentTimer.current = setTimeout(() => setOpen(true), 280);
  };
  const leave = () => {
    clearTimeout(leaveTimer.current);
    clearTimeout(intentTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!trigger.current?.contains(document.activeElement)) setOpen(false);
    }, 120);
  };
  useEffect(
    () => () => {
      clearTimeout(leaveTimer.current);
      clearTimeout(intentTimer.current);
    },
    [],
  );
  const [position, setPosition] = useState({ left: 12, top: 12 });
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const box = tip.current?.getBoundingClientRect();
      if (!anchor || !box) return;
      setPosition({
        left: Math.max(
          12,
          Math.min(
            innerWidth - box.width - 12,
            anchor.x + (anchor.width - box.width) / 2,
          ),
        ),
        top: Math.max(
          12,
          anchor.bottom + box.height + 20 <= innerHeight
            ? anchor.bottom + 8
            : anchor.top - box.height - 8,
        ),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  return (
    <span
      ref={trigger}
      className={`ui-tooltip-anchor ${className}`}
      tabIndex={focusable ? 0 : undefined}
      role={focusable ? "group" : undefined}
      aria-label={displayText(focusable ? text : undefined)}
      onPointerMove={intend}
      onMouseLeave={leave}
      onFocus={show}
      onBlur={leave}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {displayText(children(open ? id : undefined))}
      {open &&
        createPortal(
          <span
            ref={tip}
            id={id}
            role="tooltip"
            className="ui-tooltip"
            style={position}
            onMouseEnter={show}
            onMouseLeave={leave}
          >
            {displayText(text)}
          </span>,
          document.body,
        )}
    </span>
  );
}
