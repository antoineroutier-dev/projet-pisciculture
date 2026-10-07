import {
  useEffect,
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
      aria-label={label}
      title={props.title || label}
    >
      {children}
    </button>
  );
}
export function Drawer({
  id,
  title,
  close,
  children,
}: {
  id: string;
  title: string;
  close: () => void;
  children: ReactNode;
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
          {title}
        </h2>
        <IconButton
          onClick={close}
          label="Fermer le panneau"
          title="Fermer · Échap"
        >
          <X size={20} />
        </IconButton>
      </header>
      <div
        className="management-content"
        ref={content}
        tabIndex={0}
        role="region"
        aria-label="Contenu du panneau"
      >
        {children}
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
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="ui-tabs">
      <div
        role="tablist"
        aria-label={label}
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
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
export function Toast({
  text,
  ok,
  close,
}: {
  text: string;
  ok: boolean;
  close: () => void;
}) {
  return (
    <div className={`toast ${ok ? "" : "error"}`} role="status">
      {ok ? <Check size={18} /> : <AlertTriangle size={18} />}
      <span>{text}</span>
      <IconButton label="Fermer la notification" onClick={close}>
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
    <ol className="ui-stepper" aria-label={label}>
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined}>
          <span aria-hidden="true">
            {i < current ? <Check size={14} /> : i + 1}
          </span>
          {s}
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
      {children}
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
      {children}
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
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.max(0, Math.min(max, value))}
        aria-valuetext={caption}
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
        {tone === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}{" "}
        {caption}
      </span>
    </div>
  );
}
export function Sparkline({
  values,
  label,
}: {
  values: readonly number[];
  label: string;
}) {
  const low = Math.min(...values),
    high = Math.max(...values),
    range = high - low || 1;
  const points = values
    .map(
      (v, i) =>
        `${4 + (i / Math.max(1, values.length - 1)) * 192},${36 - ((v - low) / range) * 32}`,
    )
    .join(" ");
  return (
    <svg
      className="ui-sparkline"
      viewBox="0 0 200 40"
      role="img"
      aria-label={label}
    >
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
      {label} · {days <= 0 ? "aujourd’hui" : `${days} ${plural(days, "jour")}`}
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
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
      <small>{detail}</small>
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
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="ui-segmented">
      <legend>{label}</legend>
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
            <span>{o.label}</span>
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
        {label}
        <output htmlFor={id}>
          {value}
          {unit}
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
        <strong>{label}</strong>
        {description && <small id={id}>{description}</small>}
      </span>
      <Button
        tone="secondary"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        aria-describedby={description ? id : undefined}
        onClick={() => onChange(!checked)}
      >
        {checked ? "Activé" : "Désactivé"}
      </Button>
    </div>
  );
}
