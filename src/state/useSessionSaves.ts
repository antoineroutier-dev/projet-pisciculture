import { useCallback, useEffect, useRef, useState } from "react";
import type { Game } from "../game";
import type { Ledger } from "./ledger";
import { VisiblePlaytime, type SaveMetadata } from "./saveMetadata";
import { SAVE_KEY, serializeSave, type Save } from "./saves";
import { slotKey } from "./saveSlots";
import { captureWorld } from "../world/snapshots";

export function useSessionSaves(
  game: Game,
  ledger: Ledger,
  initial: SaveMetadata,
) {
  const latest = useRef({ game, ledger });
  latest.current = { game, ledger };
  const metadata = useRef(initial),
    generation = useRef(0);
  const alive = useRef(true);
  const expectedRaw = useRef<string | null | undefined>(undefined);
  if (expectedRaw.current === undefined) {
    try {
      expectedRaw.current = localStorage.getItem(SAVE_KEY);
    } catch {
      expectedRaw.current = null;
    }
  }
  const timer = useRef<VisiblePlaytime | null>(null);
  if (!timer.current)
    timer.current = new VisiblePlaytime(
      initial.playedMs,
      performance.now(),
      !document.hidden,
    );
  const [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  const snapshot = useCallback(
    (): Save => ({
      version: 5,
      ...latest.current,
      metadata: {
        ...metadata.current,
        playedMs: timer.current!.read(performance.now()),
        savedAt: new Date().toISOString(),
      },
    }),
    [],
  );
  const writeAutomatic = useCallback(() => {
    if (!alive.current) throw Error("Cette session est fermée.");
    const value = snapshot();
    try {
      if (localStorage.getItem(SAVE_KEY) !== expectedRaw.current)
        throw Error("Une autre version a été enregistrée.");
      const raw = serializeSave(
        value.game,
        value.ledger,
        false,
        value.metadata,
      );
      localStorage.setItem(SAVE_KEY, raw);
      expectedRaw.current = raw;
      setSaved(true);
      setError("");
      setRevision((n) => n + 1);
      return value;
    } catch {
      setSaved(false);
      setError(
        "La sauvegarde automatique est indisponible. Exportez votre partie depuis les paramètres pour la conserver.",
      );
      throw Error(
        "L’enregistrement a échoué. Exportez une copie JSON pour conserver votre partie.",
      );
    }
  }, [snapshot]);
  const flush = useCallback(() => {
    try {
      writeAutomatic();
    } catch {
      /* The visible status preserves the session. */
    }
  }, [writeAutomatic]);
  const preview = useCallback(async () => {
    const requestGeneration = generation.current;
    const image = await captureWorld();
    if (image && alive.current && requestGeneration === generation.current) {
      metadata.current = { ...metadata.current, thumbnail: image };
      return true;
    }
    return false;
  }, []);
  const reset = useCallback((value: SaveMetadata) => {
    generation.current++;
    try {
      expectedRaw.current = localStorage.getItem(SAVE_KEY);
    } catch {
      expectedRaw.current = null;
    }
    metadata.current = value;
    timer.current = new VisiblePlaytime(
      value.playedMs,
      performance.now(),
      !document.hidden,
    );
  }, []);
  useEffect(() => {
    alive.current = true;
    flush();
  }, [game, ledger, flush]);
  useEffect(() => {
    timer.current!.visibility(performance.now(), !document.hidden);
    const visibility = () => {
      timer.current!.visibility(performance.now(), !document.hidden);
      flush();
    };
    const ready = () => {
      void preview().then((valid) => {
        if (valid) flush();
      });
    };
    const interval = setInterval(() => {
      flush();
      if (!document.hidden) ready();
    }, 30000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    window.addEventListener("etangs-world-ready", ready);
    const firstPreview = setTimeout(ready, 0);
    return () => {
      alive.current = false;
      generation.current++;
      timer.current!.visibility(performance.now(), false);
      clearInterval(interval);
      clearTimeout(firstPreview);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("etangs-world-ready", ready);
    };
  }, [flush, preview]);
  const saveNow = useCallback(async () => {
    setBusy(true);
    try {
      await preview();
      return writeAutomatic();
    } finally {
      setBusy(false);
    }
  }, [preview, writeAutomatic]);
  const saveManual = useCallback(
    async (id: 1 | 2 | 3) => {
      setBusy(true);
      try {
        await preview();
        if (!alive.current) throw Error("Cette session est fermée.");
        const value = snapshot();
        localStorage.setItem(
          slotKey(id),
          serializeSave(value.game, value.ledger, false, value.metadata),
        );
        flush();
        return value;
      } finally {
        setBusy(false);
      }
    },
    [preview, snapshot, flush],
  );
  return { saved, error, revision, busy, snapshot, saveNow, saveManual, reset };
}
