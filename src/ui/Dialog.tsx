import { t, displayText } from "../i18n";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  children,
  close,
  className = "",
}: {
  className?: string;
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const titleId = useId();
  useEffect(() => {
    const previous = opener.current;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"], summary',
        ) || []),
      ].filter(
        (e) =>
          e.getClientRects().length > 0 &&
          !e.closest('[inert],[aria-hidden="true"]'),
      );
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key !== "Tab") return;
      const elements = focusable(),
        first = elements[0],
        last = elements.at(-1);
      if (!elements.length) {
        e.preventDefault();
        ref.current?.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === first ||
          !ref.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !ref.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", onKey);
      queueMicrotask(() => {
        if (document.activeElement === document.body) {
          if (previous?.isConnected) previous.focus();
          else
            document
              .querySelector<HTMLElement>('[data-testid="task-action"]')
              ?.focus();
        }
      });
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ui-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{displayText(title)}</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label={t("m_53d7fef884")}
          >
            <X size={20} />
          </button>
        </div>
        {displayText(children)}
      </div>
    </div>
  );
}
