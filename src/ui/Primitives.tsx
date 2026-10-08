import { t, displayText } from "../i18n";
import { feedbackStore, feedbackPhase } from "../state/feedback";
import { InlineFeedback } from "../world/FeedbackLayer";
import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, Clock3, X } from "lucide-react";
import { Button } from "./Button";
import { plural } from "./format";
export function IconButton({
  label,
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "disabled"> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      type="button"
      className={`ui-icon-button ${props.className || ""}`}
      aria-label={displayText(label)}
      title={displayText(props.title || label)}
    >
      {displayText(children)}
    </button>
  );
}
export function Drawer({
  id,
  title,
  close,
  children,
  summary,
}: {
  id: string;
  title: string;
  close: () => void;
  children: ReactNode;
  summary?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null),
    content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (content.current) content.current.scrollTop = 0;
  }, [id]);
  return (
    <section
      className="management-panel ui-drawer"
      id="management-panel"
      aria-labelledby="panel-heading"
      data-panel-id={id}
    >
      <header className="management-heading">
        <h2 id="panel-heading" ref={heading} tabIndex={-1}>
          {displayText(title)}
        </h2>
        <InlineFeedback />
        <IconButton
          onClick={close}
          label={t("m_0b696f2640")}
          title={t("m_343dee0304")}
        >
          <X size={20} />
        </IconButton>
      </header>
      {displayText(
        summary && (
          <div className="ui-drawer-summary">{displayText(summary)}</div>
        ),
      )}
      <div
        className="management-content"
        ref={content}
        tabIndex={0}
        role="region"
        aria-label={t("m_cb3917a506")}
      >
        {displayText(children)}
      </div>
    </section>
  );
}
export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  children,
}: {
  label: string;
  items: readonly {
    id: T;
    label: string;
  }[];
  value: T;
  onChange: (id: T) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="ui-tabs">
      <div
        role="tablist"
        aria-label={displayText(label)}
        onKeyDown={(e) => {
          const i = items.findIndex((x) => x.id === value);
          let next = i;
          if (e.key === "ArrowRight") next = (i + 1) % items.length;
          else if (e.key === "ArrowLeft")
            next = (i + items.length - 1) % items.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = items.length - 1;
          else return;
          e.preventDefault();
          onChange(items[next].id);
          e.currentTarget
            .querySelectorAll<HTMLButtonElement>("[role=tab]")
            [next]?.focus();
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            id={`${id}-${item.id}`}
            aria-selected={value === item.id}
            aria-controls={`${id}-panel`}
            tabIndex={value === item.id ? 0 : -1}
            onClick={() => onChange(item.id)}
          >
            {displayText(item.label)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
      >
        {displayText(children)}
      </div>
    </div>
  );
}
export function Toast({
  text,
  ok,
  close,
  inline = false,
  feedbackId,
}: {
  text: string;
  ok: boolean;
  close: () => void;
  inline?: boolean;
  feedbackId?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (inline) ref.current?.scrollIntoView({ block: "nearest" });
    const event = feedbackStore.getSnapshot().find((e) => e.id === feedbackId);
    if (event && ref.current?.isConnected)
      feedbackPhase(event, "result-visual", {
        connected: true,
        channel: "toast",
        inline,
      });
  }, [text, inline, feedbackId]);
  return (
    <div
      ref={ref}
      className={`toast ${ok ? "" : "error"} ${inline ? "toast-inline" : ""}`}
      role="status"
    >
      {ok ? <Check size={18} /> : <AlertTriangle size={18} />}
      <span>{displayText(text)}</span>
      <IconButton label={t("m_3ed122ecf9")} onClick={close}>
        <X size={16} />
      </IconButton>
    </div>
  );
}
export function Stepper({
  steps,
  current,
  label,
}: {
  steps: readonly string[];
  current: number;
  label: string;
}) {
  return (
    <ol className="ui-stepper" aria-label={displayText(label)}>
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined}>
          <span aria-hidden="true">
            {i < current ? <Check size={14} /> : i + 1}
          </span>
          {displayText(s)}
        </li>
      ))}
    </ol>
  );
}
export function Card({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <article {...props} className={`ui-card ${className}`}>
      {displayText(children)}
    </article>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span className={`ui-badge tone-${tone}`}>
      {tone === "danger" || tone === "warning" ? (
        <AlertTriangle size={14} />
      ) : tone === "success" ? (
        <Check size={14} />
      ) : null}
      {displayText(children)}
    </span>
  );
}
export function Gauge({
  value,
  max,
  label,
  caption,
  tone = "success",
  circular = false,
}: {
  value: number;
  max: number;
  label: string;
  caption: string;
  tone?: "success" | "warning" | "danger";
  circular?: boolean;
}) {
  const percent = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className={`ui-gauge tone-${tone} ${circular ? "circular" : ""}`}>
      <div
        role="meter"
        aria-label={displayText(label)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Number(Math.max(0, Math.min(max, value)).toFixed(6))}
        aria-valuetext={displayText(caption)}
      >
        {circular ? (
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="16" />
            <circle
              cx="20"
              cy="20"
              r="16"
              pathLength="100"
              strokeDasharray={`${percent} 100`}
            />
          </svg>
        ) : (
          <span style={{ width: `${percent}%` }} />
        )}
      </div>
      <span>
        {tone === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
        {displayText(" ")}
        {displayText(caption)}
      </span>
    </div>
  );
}
export function Sparkline({
  values,
  label,
  positions,
  domain,
}: {
  values: readonly number[];
  label: string;
  positions?: readonly number[];
  domain?: readonly [number, number];
}) {
  const low = Math.min(...values),
    high = Math.max(...values),
    range = high - low || 1;
  const points = values
    .map(
      (v, i) =>
        `${4 + (positions && domain ? (positions[i] - domain[0]) / Math.max(1, domain[1] - domain[0]) : i / Math.max(1, values.length - 1)) * 192},${36 - ((v - low) / range) * 32}`,
    )
    .join(" ");
  return (
    <svg
      className="ui-sparkline"
      viewBox="0 0 200 40"
      role="img"
      aria-label={displayText(label)}
    >
      {points
        .split(" ")
        .filter(Boolean)
        .map((point, i) => {
          const [cx, cy] = point.split(",");
          return <circle key={i} cx={cx} cy={cy} r="2" fill="currentColor" />;
        })}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
export function CountdownChip({
  days,
  label,
}: {
  days: number;
  label: string;
}) {
  return (
    <span className="ui-countdown">
      <Clock3 size={14} />
      {displayText(label)} ·{" "}
      {displayText(
        days <= 0
          ? "aujourd’hui"
          : `${days} ${plural(days, t("m_b5977b836b"), t("m_5cd11d34bc"))}`,
      )}
    </span>
  );
}
export function ResourcePill({
  label,
  value,
  detail,
  testId,
}: {
  label: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  testId?: string;
}) {
  return (
    <div className="ui-resource">
      <span>{displayText(label)}</span>
      <strong data-testid={testId}>{displayText(value)}</strong>
      <small>{displayText(detail)}</small>
    </div>
  );
}
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly {
    value: T;
    label: string;
  }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="ui-segmented">
      <legend>{displayText(label)}</legend>
      <div>
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name={label}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span>{displayText(o.label)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="ui-slider">
      <label htmlFor={id}>
        {displayText(label)}
        <output htmlFor={id}>
          {value}
          {displayText(unit)}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
    </div>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="ui-toggle">
      <span>
        <strong>{displayText(label)}</strong>
        {displayText(
          description && <small id={id}>{displayText(description)}</small>,
        )}
      </span>
      <Button
        tone="secondary"
        role="switch"
        aria-label={displayText(label)}
        aria-checked={checked}
        aria-describedby={description ? id : undefined}
        onClick={() => onChange(!checked)}
      >
        {displayText(checked ? t("m_df16db5ac6") : t("m_da60ff35b2"))}
      </Button>
    </div>
  );
}
