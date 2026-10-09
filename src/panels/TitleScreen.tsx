import { number } from "../ui/format";
import { t, displayText } from "../i18n";
import { lazy, Suspense, useCallback, useState } from "react";
import { Fish, Play, Sprout, FolderOpen, Settings2, Heart } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { SettingsPanel } from "./SettingsPanel";
import { SaveSlots, SaveSummary } from "./SaveSlots";
import { Credits } from "./Credits";
import { readSlot, newSave, downloadSave } from "../state/saveSlots";
import type { Save } from "../state/saves";
import type { Runtime } from "../state/runtime";
const FarmScene = lazy(() => import("../FarmScene"));
const still = {
  active: false,
  seeking: false,
  phase: { started: 0, duration: 0 },
};
const noop = () => {};
export function TitleScreen({
  runtime,
  start,
}: {
  runtime: Runtime;
  start: (save: Save) => void;
}) {
  const [automatic] = useState(() =>
    readSlot("auto", { getItem: (key) => localStorage.getItem(key) }),
  );
  const [fallback] = useState(() => newSave());
  const [modal, setModal] = useState<
    "new" | "load" | "settings" | "credits" | null
  >(null);
  const close = useCallback(() => setModal(null), []);
  const game = (automatic.save || fallback).game;
  return (
    <>
      <main
        className="title-screen"
        data-testid="title-screen"
        inert={modal !== null || undefined}
      >
        <div className="title-world" aria-hidden="true" inert>
          <Suspense fallback={null}>
            <FarmScene
              ponds={game.ponds}
              development={game.development}
              food={game.food}
              day={game.day}
              selected={1}
              select={noop}
              inspect={noop}
              target={null}
              panelOpen={false}
              mode="farm"
              species="trout"
              clearWater={false}
              reset={0}
              clock={still}
              graphics={runtime.graphics}
              presentation
              deferStart
            />
          </Suspense>
        </div>
        <section className="title-card" aria-label={t("m_4546ae0b01")}>
          <span className="title-emblem" aria-hidden="true">
            <Fish size={30} />
          </span>
          <p className="title-eyebrow">{t("m_c1ab32f5fa")}</p>
          <h1>{t("m_65c11c7dae")}</h1>
          <span className="title-ornament" aria-hidden="true" />
          <p className="title-tagline">{t("m_facdc658f9")}</p>
          <nav className="title-actions" aria-label={t("m_867c73dbd4")}>
            <Button
              tone="primary"
              disabled={!automatic.save}
              disabledReason={displayText(automatic.error || t("m_b707b01aa9"))}
              onClick={() => start(automatic.save!)}
            >
              <Play size={18} />
              {t("m_3bc3807f22")}
            </Button>
            <Button tone="secondary" onClick={() => setModal("new")}>
              <Sprout size={18} />
              {t("m_c1f44907f3")}
            </Button>
            <Button tone="secondary" onClick={() => setModal("load")}>
              <FolderOpen size={18} />
              {t("m_3e961df87c")}
            </Button>
            <Button tone="secondary" onClick={() => setModal("settings")}>
              <Settings2 size={18} />
              {t("m_01923df7a4")}
            </Button>
            <Button tone="secondary" onClick={() => setModal("credits")}>
              <Heart size={18} />
              {t("m_f008a259cf")}
            </Button>
          </nav>
          {automatic.save && (
            <details className="title-last-save">
              <summary>
                {t("m_bb4317c6c1") + " "}
                {number(game.day)}
              </summary>
              <SaveSummary value={automatic.save} />
            </details>
          )}
          {displayText(
            automatic.error && (
              <div className="title-recovery">
                <p role="alert">{displayText(automatic.error)}</p>
                <p className="hint">
                  {t("m_5d9a3be73a")}
                  {displayText(" ")}
                  {displayText(
                    runtime.preferences.defaultMode === "guided"
                      ? t("m_3873b9a965")
                      : "expert",
                  )}
                  {t("m_e20447700b")}
                </p>
                {automatic.raw !== null && (
                  <Button
                    onClick={() =>
                      downloadSave(
                        automatic.raw!,
                        "les-etangs-recuperation.json",
                      )
                    }
                  >
                    {t("m_f5b745425c")}
                  </Button>
                )}
              </div>
            ),
          )}
          <small>{t("m_ee2ba3db8d")}</small>
        </section>
      </main>
      {modal && (
        <Dialog
          key={modal}
          title={displayText(
            {
              new: t("m_c6b7da6cef"),
              load: t("m_3e961df87c"),
              settings: t("m_01923df7a4"),
              credits: t("m_f008a259cf"),
            }[modal],
          )}
          close={close}
          className={modal === "load" ? "save-dialog" : ""}
        >
          {modal === "new" && (
            <div className="new-game-options">
              <p>{t("m_8392615bc7")}</p>
              <p className="hint">
                {t("m_5d9a3be73a")}
                {displayText(" ")}
                {displayText(
                  runtime.preferences.defaultMode === "guided"
                    ? t("m_3873b9a965")
                    : "expert",
                )}
                {t("m_e20447700b")}
              </p>
              {automatic.raw !== null && (
                <p className="inline-error">{t("m_a55119d87c")}</p>
              )}
              <Button
                tone={
                  runtime.preferences.defaultMode === "guided"
                    ? "primary"
                    : "secondary"
                }
                onClick={() => start(newSave("guided"))}
              >
                {t("m_fd225077c9")}
              </Button>
              <p className="hint">{t("m_b71e9b39df")}</p>
              <Button
                tone={
                  runtime.preferences.defaultMode === "expert"
                    ? "primary"
                    : "secondary"
                }
                onClick={() => start(newSave("expert"))}
              >
                {t("m_9e47e27085")}
              </Button>
              <p className="hint">{t("m_04f2b9ebb7")}</p>
            </div>
          )}
          {modal === "load" && <SaveSlots load={start} />}
          {modal === "settings" && <SettingsPanel runtime={runtime} />}
          {modal === "credits" && <Credits />}
        </Dialog>
      )}
    </>
  );
}
