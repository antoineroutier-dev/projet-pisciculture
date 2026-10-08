import { t, displayText } from "../i18n";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
export async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
}
export function FullscreenSetting() {
  const [active, setActive] = useState(!!document.fullscreenElement),
    [error, setError] = useState("");
  useEffect(() => {
    const change = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  return (
    <div className="fullscreen-setting">
      <Button
        tone="secondary"
        aria-pressed={active}
        onClick={() => {
          setError("");
          void toggleFullscreen().catch(() => setError(t("m_39714d2baf")));
        }}
      >
        {displayText(active ? t("m_3645da6272") : t("m_418c5a79d4"))}
      </Button>
      {displayText(error && <p role="status">{displayText(error)}</p>)}
    </div>
  );
}
