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
          void toggleFullscreen().catch(() =>
            setError(
              "Le navigateur demande un clic ou une touche du clavier pour autoriser le plein écran.",
            ),
          );
        }}
      >
        {active ? "Quitter le plein écran" : "Passer en plein écran"}
      </Button>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
