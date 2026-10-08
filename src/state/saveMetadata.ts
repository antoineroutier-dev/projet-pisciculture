/** Presentation metadata only. Biological Game V3 and financial Ledger V1 stay unchanged. */
export type SaveMetadata = {
  playedMs: number;
  priorPlaytimeUnknown: boolean;
  savedAt: string | null;
  thumbnail: string | null;
};
export const initialMetadata = (
  priorPlaytimeUnknown = false,
): SaveMetadata => ({
  playedMs: 0,
  priorPlaytimeUnknown,
  savedAt: null,
  thumbnail: null,
});
export function parseMetadata(value: unknown): SaveMetadata {
  const fail = () => {
    throw Error(
      "Les informations de cette sauvegarde sont incompatibles. La partie actuelle est conservée.",
    );
  };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail();
  const v = value as Record<string, unknown>;
  if (
    typeof v.playedMs !== "number" ||
    !Number.isSafeInteger(v.playedMs) ||
    v.playedMs < 0 ||
    v.playedMs > 1e12 ||
    typeof v.priorPlaytimeUnknown !== "boolean"
  )
    return fail();
  if (
    v.savedAt !== null &&
    (typeof v.savedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.savedAt) ||
      !Number.isFinite(Date.parse(v.savedAt)) ||
      new Date(v.savedAt).toISOString() !== v.savedAt)
  )
    return fail();
  if (
    v.thumbnail !== null &&
    (typeof v.thumbnail !== "string" ||
      v.thumbnail.length > 180_000 ||
      !/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        v.thumbnail,
      ))
  )
    return fail();
  return {
    playedMs: v.playedMs,
    priorPlaytimeUnknown: v.priorPlaytimeUnknown,
    savedAt: v.savedAt as string | null,
    thumbnail: v.thumbnail as string | null,
  };
}

/** Accumulate real visible session time, including paused planning, never offline/title time. */
export class VisiblePlaytime {
  private accumulated: number;
  private started: number | null;
  constructor(playedMs: number, now: number, visible: boolean) {
    this.accumulated = playedMs;
    this.started = visible ? now : null;
  }
  read(now: number) {
    return Math.floor(
      Math.min(
        1e12,
        this.accumulated +
          (this.started === null ? 0 : Math.max(0, now - this.started)),
      ),
    );
  }
  visibility(now: number, visible: boolean) {
    this.accumulated = this.read(now);
    this.started = visible ? now : null;
  }
}
export function playtimeLabel(meta: SaveMetadata) {
  const minutes = Math.floor(meta.playedMs / 60000),
    hours = Math.floor(minutes / 60);
  const current =
    minutes < 1
      ? "Moins d’une minute"
      : hours
        ? `${hours} h ${minutes % 60} min`
        : `${minutes} min`;
  return meta.priorPlaytimeUnknown
    ? `${current} depuis l’import · durée antérieure inconnue`
    : current;
}
