import { displayText } from "../i18n";
import type { ButtonHTMLAttributes } from "react";
import { Tooltip } from "./Tooltip";
type Availability =
  | {
      disabled?: false;
      disabledReason?: never;
    }
  | {
      disabled: boolean;
      disabledReason: string;
    };
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> &
  Availability & {
    tone?: "primary" | "secondary" | "quiet" | "danger";
    size?: "small" | "normal";
    shortcut?: string;
  };
/** New disabled actions require an explanation at the call site. */
export function Button({
  tone = "primary",
  size = "normal",
  shortcut,
  disabledReason,
  className = "",
  children,
  type = "button",
  ...props
}: Props) {
  const button = (descriptionId?: string) => (
    <button
      {...props}
      type={type}
      aria-describedby={descriptionId ?? props["aria-describedby"]}
      className={`ui-button ui-button-${tone} ui-button-${size} ${className}`}
    >
      {displayText(children)}
      {displayText(
        shortcut && <kbd aria-hidden="true">{displayText(shortcut)}</kbd>,
      )}
    </button>
  );
  return props.disabled && disabledReason ? (
    <Tooltip
      text={displayText(disabledReason)}
      focusable
      className={className.includes("full") ? "full" : ""}
    >
      {button}
    </Tooltip>
  ) : (
    button()
  );
}
