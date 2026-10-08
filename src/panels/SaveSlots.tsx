import { number } from "../ui/format";
import { t, displayText, localeTag } from "../i18n";
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
  id === "auto" ? t("m_89bd8db002") : t("m_e596a6b51a", id);
export function SaveSummary({ value }: { value: Save }) {
  return (
    <div className="save-summary">
      {value.metadata.thumbnail ? (
        <img src={value.metadata.thumbnail} alt={t("m_cbe67127ce")} />
      ) : (
        <span className="save-no-preview">
          <ImageOff size={24} />
          {t("m_2fe0746573")}
        </span>
      )}
      <div>
        <strong>
          {t("m_3eb0f64015") + " "}
          {number(value.game.day)} · {displayText(formatDate(value.game.day))}
        </strong>
        <span>{displayText(formatMoney(value.game.money))}</span>
        <small>{displayText(playtimeLabel(value.metadata))}</small>
        {displayText(
          value.metadata.savedAt && (
            <small>
              {t("m_5202941072")}
              {displayText(" ")}
              {displayText(
                new Intl.DateTimeFormat(localeTag(), {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(value.metadata.savedAt)),
              )}
            </small>
          ),
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
    setNotice({ text: t("m_29fb0de31b"), ok: true });
    try {
      await save!(id);
      setSlots(browserSlots());
      setConfirm(null);
      setNotice({ text: t("m_1af3d72b53", slotName(id)), ok: true });
    } catch {
      setNotice({
        text: t("m_784f33dc06"),
        ok: false,
      });
    } finally {
      setBusy(false);
    }
  }
  async function importFile(value?: File) {
    if (!value) return;
    try {
      if (value.size > 2000000) throw Error(t("m_bf4a999543"));
      load(parseSavedGame(await value.text()));
    } catch (error) {
      setNotice({ text: (error as Error).message, ok: false });
    }
    if (file.current) file.current.value = "";
  }
  return (
    <div className="save-slots" aria-busy={busy}>
      <p className="hint">{t("m_08d88d3c46")}</p>
      {displayText(
        notice.text && (
          <p role={notice.ok ? "status" : "alert"}>
            {displayText(notice.text)}
          </p>
        ),
      )}
      {confirm ? (
        <section className="save-confirm" aria-label={t("m_bcc972e05a")}>
          <h3>
            {t("m_2eb5329254") + " "}
            {displayText(slotName(confirm.id).toLowerCase())} ?
          </h3>
          {confirm.save ? (
            <SaveSummary value={confirm.save} />
          ) : (
            <p>{t("m_6bdb69e413")}</p>
          )}
          {current && (
            <p>
              {t("m_c25882a6f4") + " "}
              {number(current.game.day)} ·{displayText(" ")}
              {displayText(formatMoney(current.game.money))}.
            </p>
          )}
          <div className="button-row">
            <Button
              disabled={busy}
              disabledReason={t("m_fa6a49dd28")}
              onClick={() => setConfirm(null)}
            >
              {t("m_46ad3916f6")}
            </Button>
            <Button
              tone="danger"
              disabled={busy}
              disabledReason={t("m_fa6a49dd28")}
              onClick={() => void write(confirm.id as 1 | 2 | 3)}
            >
              {t("m_8a40ac89ec")}
            </Button>
          </div>
        </section>
      ) : (
        <div className="save-grid">
          {slots.map((slot) => (
            <article className="save-slot" key={slot.id} data-slot={slot.id}>
              <h3>{displayText(slotName(slot.id))}</h3>
              {slot.save ? (
                <SaveSummary value={slot.save} />
              ) : (
                <p>{displayText(slot.error || t("m_e0b8d59a1b"))}</p>
              )}
              <div className="button-row">
                <Button
                  disabled={!slot.save || busy}
                  disabledReason={displayText(
                    busy ? t("m_fa6a49dd28") : slot.error || t("m_ad2cc22589"),
                  )}
                  onClick={() => load(slot.save!)}
                >
                  {t("m_fd351654f4") + " "}
                  {displayText(slotName(slot.id).toLowerCase())}
                </Button>
                {save && slot.id !== "auto" && (
                  <Button
                    disabled={busy}
                    disabledReason={t("m_fa6a49dd28")}
                    onClick={() =>
                      slot.raw !== null
                        ? setConfirm(slot)
                        : void write(slot.id as 1 | 2 | 3)
                    }
                  >
                    <SaveIcon size={16} />
                    {t("m_f9d3012783")}
                  </Button>
                )}
              </div>
              {displayText(
                slot.error && slot.raw !== null && (
                  <Button
                    onClick={() =>
                      downloadSave(
                        slot.raw!,
                        `les-etangs-recuperation-${slot.id}.json`,
                      )
                    }
                  >
                    {t("m_f5b745425c")}
                  </Button>
                ),
              )}
            </article>
          ))}
        </div>
      )}
      <details className="save-advanced">
        <summary>{t("m_dcec126e9a")}</summary>
        <div className="button-row">
          <Button
            onClick={() => file.current?.click()}
            disabled={busy}
            disabledReason={t("m_fa6a49dd28")}
          >
            <Upload size={16} />
            {t("m_da243ce47e")}
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
                        current.profile,
                      ),
                      `les-etangs-jour-${number(current.game.day)}.json`,
                    )
              }
            >
              <Download size={16} />
              {t("m_6e634f953d")}
            </Button>
          )}
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept=".json,application/json"
          aria-label={t("m_00dde4de80")}
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </details>
    </div>
  );
}
