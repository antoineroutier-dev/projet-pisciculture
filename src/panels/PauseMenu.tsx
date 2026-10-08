import { t, displayText } from "../i18n";
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
      {displayText(" ")}
      {busy && <p role="status">{t("m_29fb0de31b")}</p>}
      <nav
        className="pause-menu"
        aria-label={t("m_df641fc301")}
        inert={busy || undefined}
      >
        <Button tone="primary" onClick={resume}>
          {t("m_ddd913203f")}
        </Button>
        <Button tone="secondary" onClick={save}>
          {t("m_400cdf4c41")}
        </Button>
        <Button tone="secondary" onClick={load}>
          {t("m_fd351654f4")}
        </Button>
        <Button tone="secondary" onClick={settings}>
          {t("m_01923df7a4")}
        </Button>
        <Button tone="secondary" onClick={guide}>
          {t("m_8dd65d0952")}
        </Button>
        <Button tone="secondary" onClick={title}>
          {t("m_54d9ebda3f")}
        </Button>
      </nav>
    </>
  );
}
