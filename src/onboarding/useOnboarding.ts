import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Game } from "../game";
import type { Profile } from "../state/profile";
import type { PanelId } from "../state/navigation";
import { tutorialStep, type TourPanel } from "./tutorial";
import { t, type MessageKey } from "../i18n";
export function useOnboarding(
  game: Game,
  profile: Profile,
  setProfile: Dispatch<SetStateAction<Profile>>,
  panel: PanelId | null,
  blocked: boolean,
  session: number,
) {
  const [visited, setVisited] = useState<TourPanel[]>([]);
  useEffect(() => setVisited([]), [session]);
  const [revision, setRevision] = useState(0);
  const intro = !profile.introSeen;
  const active = profile.tutorial === "active";
  const step = tutorialStep(game, visited);
  const finishIntro = () => setProfile((p) => ({ ...p, introSeen: true }));
  useEffect(() => {
    if (!intro) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ready = () => {
      if (
        timer ||
        !document.querySelector('canvas[data-frame="rendered"],.world-fallback')
      )
        return;
      timer = setTimeout(
        () => setProfile((p) => ({ ...p, introSeen: true })),
        3000,
      );
    };
    const observer = new MutationObserver(ready);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-frame"],
    });
    ready();
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [intro, setProfile]);
  useEffect(() => {
    if (!active || intro || blocked) return;
    const selector =
      step === "water"
        ? '[data-world-source], [data-testid="task-action"]'
        : step === "plot"
          ? '[data-world-pond="1"], [data-testid="construction-card"] button, [data-testid="task-action"]'
          : ["ponds", "logistics", "finance"].includes(step)
            ? `.game-dock [data-panel="${step}"]`
            : step === "build"
              ? '[data-testid="construction-card"] button, [data-testid="task-action"]'
              : '[data-testid="task-action"]';
    let current: HTMLElement | null = null;
    const update = () => {
      const nodes = [...document.querySelectorAll<HTMLElement>(selector)];
      const target =
        nodes.find(
          (e) =>
            !e.closest("[inert]") &&
            e.checkVisibility({ checkVisibilityCSS: true }) &&
            e.getBoundingClientRect().width > 0,
        ) ?? null;
      if (target === current) return;
      current?.removeAttribute("data-tutorial-target");
      current = target;
      current?.setAttribute("data-tutorial-target", "true");
    };
    update();
    const interval = setInterval(update, 250);
    return () => {
      clearInterval(interval);
      current?.removeAttribute("data-tutorial-target");
    };
  }, [active, intro, step, panel, blocked, revision]);
  const replay = () => {
    setVisited([]);
    setRevision((v) => v + 1);
    setProfile((p) => ({ ...p, introSeen: true, tutorial: "active" }));
  };
  const skip = () =>
    setProfile((p) => ({ ...p, introSeen: true, tutorial: "dismissed" }));
  const acknowledge = () => {
    if (step === "finish") setProfile((p) => ({ ...p, tutorial: "completed" }));
    else if (["ponds", "logistics", "finance"].includes(step) && panel === step)
      setVisited((v) => [...new Set([...v, step as TourPanel])]);
  };
  return {
    intro,
    active,
    step,
    finishIntro,
    skip,
    replay,
    acknowledge,
    canAcknowledge: step === "finish" || panel === step,
    text: t(`tutorial.${step}` as MessageKey),
  };
}
