import { Button } from "../ui/Button";
export function PauseMenu({
  resume,
  save,
  load,
  settings,
  guide,
  title,
  busy = false,
}: {
  busy?: boolean;
  resume: () => void;
  save: () => void;
  load: () => void;
  settings: () => void;
  guide: () => void;
  title: () => void;
}) {
  return (
    <>
      {" "}
      {busy && <p role="status">Capture et enregistrement…</p>}
      <nav
        className="pause-menu"
        aria-label="Menu pause"
        inert={busy || undefined}
      >
        <Button tone="primary" onClick={resume}>
          Reprendre
        </Button>
        <Button tone="secondary" onClick={save}>
          Sauvegarder
        </Button>
        <Button tone="secondary" onClick={load}>
          Charger
        </Button>
        <Button tone="secondary" onClick={settings}>
          Paramètres
        </Button>
        <Button tone="secondary" onClick={guide}>
          Guide
        </Button>
        <Button tone="secondary" onClick={title}>
          Retour au menu
        </Button>
      </nav>
    </>
  );
}
