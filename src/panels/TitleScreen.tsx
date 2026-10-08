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
            />
          </Suspense>
        </div>
        <section className="title-card" aria-label="Menu principal">
          <Fish size={32} aria-hidden="true" />
          <p className="title-eyebrow">
            Un domaine. Une source. Tout à construire.
          </p>
          <h1>Les Étangs</h1>
          <p className="title-tagline">
            Faites grandir votre pisciculture, de la première goutte à la
            dernière livraison.
          </p>
          <nav className="title-actions" aria-label="Démarrer une partie">
            <Button
              tone="primary"
              disabled={!automatic.save}
              disabledReason={
                automatic.error ||
                "Commencez une nouvelle partie ou chargez une sauvegarde."
              }
              onClick={() => start(automatic.save!)}
            >
              <Play size={18} />
              Continuer
            </Button>
            <Button tone="secondary" onClick={() => setModal("new")}>
              <Sprout size={18} />
              Nouvelle partie
            </Button>
            <Button tone="secondary" onClick={() => setModal("load")}>
              <FolderOpen size={18} />
              Charger une partie
            </Button>
            <Button tone="secondary" onClick={() => setModal("settings")}>
              <Settings2 size={18} />
              Paramètres
            </Button>
            <Button tone="secondary" onClick={() => setModal("credits")}>
              <Heart size={18} />
              Crédits
            </Button>
          </nav>
          {automatic.save && (
            <details className="title-last-save">
              <summary>Dernière exploitation · jour {game.day}</summary>
              <SaveSummary value={automatic.save} />
            </details>
          )}
          {automatic.error && (
            <div className="title-recovery">
              <p role="alert">{automatic.error}</p>
              {automatic.raw !== null && (
                <Button
                  onClick={() =>
                    downloadSave(automatic.raw!, "les-etangs-recuperation.json")
                  }
                >
                  Exporter le fichier original
                </Button>
              )}
            </div>
          )}
          <small>Solo · hors ligne · sauvegardes sur cet appareil</small>
        </section>
      </main>
      {modal && (
        <Dialog
          key={modal}
          title={
            {
              new: "Commencer une exploitation",
              load: "Charger une partie",
              settings: "Paramètres",
              credits: "Crédits",
            }[modal]
          }
          close={close}
          className={modal === "load" ? "save-dialog" : ""}
        >
          {modal === "new" && (
            <div className="new-game-options">
              <p>
                Vous disposez d’un terrain inexploité et de 60 000 €. Analysez
                votre eau avant de choisir une filière.
              </p>
              {automatic.raw !== null && (
                <p className="inline-error">
                  La sauvegarde automatique sera remplacée. Les trois
                  emplacements manuels sont conservés. Vous pouvez d’abord
                  charger et exporter votre partie.
                </p>
              )}
              <Button tone="primary" onClick={() => start(newSave("guided"))}>
                Commencer avec les aides pédagogiques
              </Button>
              <p className="hint">
                Conseils et aides financières aux étapes d’apprentissage.
              </p>
              <Button tone="secondary" onClick={() => start(newSave("expert"))}>
                Commencer en mode expert
              </Button>
              <p className="hint">
                Les mêmes règles biologiques, sans aides économiques.
              </p>
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
