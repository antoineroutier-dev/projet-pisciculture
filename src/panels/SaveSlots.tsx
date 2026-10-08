import { useRef, useState } from "react";
import { ImageOff, Download, Upload, Save as SaveIcon } from "lucide-react";
import { Button } from "../ui/Button";
import { formatDate, formatMoney } from "../ui/format";
import { playtimeLabel } from "../state/saveMetadata";
import { parseSavedGame, serializeSave, type Save } from "../state/saves";
import {
  readSlots,
  downloadSave,
  type Slot,
  type SlotId,
} from "../state/saveSlots";
export const slotName = (id: SlotId) =>
  id === "auto" ? "Automatique" : `Emplacement ${id}`;
export function SaveSummary({ value }: { value: Save }) {
  return (
    <div className="save-summary">
      {value.metadata.thumbnail ? (
        <img
          src={value.metadata.thumbnail}
          alt="Vue récente de cette exploitation"
        />
      ) : (
        <span className="save-no-preview">
          <ImageOff size={24} />
          Aperçu indisponible
        </span>
      )}
      <div>
        <strong>
          Jour {value.game.day} · {formatDate(value.game.day)}
        </strong>
        <span>{formatMoney(value.game.money)}</span>
        <small>{playtimeLabel(value.metadata)}</small>
        {value.metadata.savedAt && (
          <small>
            Enregistré le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(value.metadata.savedAt))}
          </small>
        )}
      </div>
    </div>
  );
}
const browserSlots = () =>
  readSlots({ getItem: (key) => localStorage.getItem(key) });
export function SaveSlots({
  load,
  save,
  current,
  exportCurrent,
}: {
  load: (value: Save) => void;
  save?: (id: 1 | 2 | 3) => Promise<Save>;
  current?: Save;
  exportCurrent?: () => void;
}) {
  const [slots, setSlots] = useState(browserSlots),
    [confirm, setConfirm] = useState<Slot | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState({ text: "", ok: true });
  const file = useRef<HTMLInputElement>(null);
  async function write(id: 1 | 2 | 3) {
    setBusy(true);
    setNotice({ text: "Capture et enregistrement…", ok: true });
    try {
      await save!(id);
      setSlots(browserSlots());
      setConfirm(null);
      setNotice({ text: `${slotName(id)} enregistré.`, ok: true });
    } catch {
      setNotice({
        text: "Cet emplacement n’a pas pu être enregistré. Exportez une copie JSON.",
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }
  async function importFile(value?: File) {
    if (!value) return;
    try {
      if (value.size > 2_000_000)
        throw Error("Ce fichier est trop volumineux.");
      load(parseSavedGame(await value.text()));
    } catch (error) {
      setNotice({ text: (error as Error).message, ok: false });
    }
    if (file.current) file.current.value = "";
  }
  return (
    <div className="save-slots" aria-busy={busy}>
      <p className="hint">
        Trois emplacements manuels et une sauvegarde automatique, sur cet
        appareil.
      </p>
      {notice.text && (
        <p role={notice.ok ? "status" : "alert"}>{notice.text}</p>
      )}
      {confirm ? (
        <section
          className="save-confirm"
          aria-label="Confirmer le remplacement"
        >
          <h3>Remplacer {slotName(confirm.id).toLowerCase()} ?</h3>
          {confirm.save ? (
            <SaveSummary value={confirm.save} />
          ) : (
            <p>
              Le fichier existant est illisible. Exportez-le avant de le
              remplacer.
            </p>
          )}
          {current && (
            <p>
              Nouvelle copie : jour {current.game.day} ·{" "}
              {formatMoney(current.game.money)}.
            </p>
          )}
          <div className="button-row">
            <Button
              disabled={busy}
              disabledReason="L’enregistrement est en cours."
              onClick={() => setConfirm(null)}
            >
              Annuler
            </Button>
            <Button
              tone="danger"
              disabled={busy}
              disabledReason="L’enregistrement est en cours."
              onClick={() => void write(confirm.id as 1 | 2 | 3)}
            >
              Remplacer cet emplacement
            </Button>
          </div>
        </section>
      ) : (
        <div className="save-grid">
          {slots.map((slot) => (
            <article className="save-slot" key={slot.id} data-slot={slot.id}>
              <h3>{slotName(slot.id)}</h3>
              {slot.save ? (
                <SaveSummary value={slot.save} />
              ) : (
                <p>{slot.error || "Emplacement vide"}</p>
              )}
              <div className="button-row">
                <Button
                  disabled={!slot.save || busy}
                  disabledReason={
                    busy
                      ? "L’enregistrement est en cours."
                      : slot.error || "Aucune partie enregistrée ici."
                  }
                  onClick={() => load(slot.save!)}
                >
                  Charger {slotName(slot.id).toLowerCase()}
                </Button>
                {save && slot.id !== "auto" && (
                  <Button
                    disabled={busy}
                    disabledReason="L’enregistrement est en cours."
                    onClick={() =>
                      slot.raw !== null
                        ? setConfirm(slot)
                        : void write(slot.id as 1 | 2 | 3)
                    }
                  >
                    <SaveIcon size={16} />
                    Sauvegarder ici
                  </Button>
                )}
              </div>
              {slot.error && slot.raw !== null && (
                <Button
                  onClick={() =>
                    downloadSave(
                      slot.raw!,
                      `les-etangs-recuperation-${slot.id}.json`,
                    )
                  }
                >
                  Exporter le fichier original
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
      <details className="save-advanced">
        <summary>Options avancées · JSON</summary>
        <div className="button-row">
          <Button
            onClick={() => file.current?.click()}
            disabled={busy}
            disabledReason="L’enregistrement est en cours."
          >
            <Upload size={16} />
            Importer une sauvegarde
          </Button>
          {current && (
            <Button
              onClick={() =>
                exportCurrent
                  ? exportCurrent()
                  : downloadSave(
                      serializeSave(
                        current.game,
                        current.ledger,
                        true,
                        current.metadata,
                      ),
                      `les-etangs-jour-${current.game.day}.json`,
                    )
              }
            >
              <Download size={16} />
              Exporter ma partie
            </Button>
          )}
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept=".json,application/json"
          aria-label="Fichier de sauvegarde"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </details>
    </div>
  );
}
