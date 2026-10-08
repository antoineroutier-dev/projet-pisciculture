import {
  STORAGE_KEY,
  V2_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  initialGame,
  type Game,
} from "../game";
import { initialLedger } from "./ledger";
import { initialMetadata } from "./saveMetadata";
import { parseSavedGame, SAVE_KEY, V4_SAVE_KEY, type Save } from "./saves";
export type SlotId = "auto" | 1 | 2 | 3;
export type Slot = {
  id: SlotId;
  key: string;
  raw: string | null;
  save: Save | null;
  error: string;
};
export const slotKey = (id: SlotId) =>
  id === "auto" ? SAVE_KEY : `les-etangs-slot-${id}`;
type StorageReader = Pick<Storage, "getItem">;
export function readSlot(id: SlotId, storage: StorageReader): Slot {
  let key = slotKey(id),
    raw: string | null = null;
  try {
    for (const candidate of id === "auto"
      ? [SAVE_KEY, V4_SAVE_KEY, STORAGE_KEY, V2_STORAGE_KEY, LEGACY_STORAGE_KEY]
      : [key]) {
      key = candidate;
      raw = storage.getItem(candidate);
      if (raw !== null) break;
    }
    return {
      id,
      key: raw === null ? slotKey(id) : key,
      raw,
      save: raw === null ? null : parseSavedGame(raw),
      error: "",
    };
  } catch {
    return {
      id,
      key,
      raw,
      save: null,
      error:
        raw === null
          ? "Le stockage est indisponible. Importez ou exportez une copie JSON pour conserver votre partie."
          : "La sauvegarde ne peut pas être lue. Elle est conservée ; vous pouvez exporter son fichier original.",
    };
  }
}
export const readSlots = (storage: StorageReader): Slot[] =>
  (["auto", 1, 2, 3] as const).map((id) => readSlot(id, storage));
export function newSave(mode: Game["mode"] = "guided"): Save {
  const game = initialGame(mode);
  return {
    version: 5,
    game,
    ledger: initialLedger(game),
    metadata: initialMetadata(),
  };
}
export function downloadSave(raw: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([raw], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
