import * as T from "three";
import { placeLabel, type Box } from "./placement";
import { POND_POSITIONS } from "../farm3d";
/** DOM labels are measured only after layout changes, then projected with the existing render loop. */
export function createLabelLayout(host: HTMLElement, invalidate: () => void) {
  let dirty = true,
    excluded: Box[] = [],
    nodes: {
      element: HTMLButtonElement;
      id: number;
      width: number;
      height: number;
    }[] = [];
  const mark = () => {
      dirty = true;
      invalidate();
    },
    observer = new ResizeObserver(mark),
    mutations = new MutationObserver(mark);
  const observed = new Set<Element>();
  mutations.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["open", "data-panel", "inert"],
  });
  function measure() {
    const current = new Set<Element>();
    nodes = [
      ...host.querySelectorAll<HTMLButtonElement>("[data-world-pond]"),
    ].map((element) => {
      current.add(element);
      return {
        element,
        id: Number(element.dataset.worldPond),
        width: element.offsetWidth,
        height: element.offsetHeight,
      };
    });
    excluded = [];
    for (const e of document.querySelectorAll<HTMLElement>(
      ".game-hud,.goal-hud,.game-dock,.world-controls,.ui-drawer,.fish-inspector,.notification-stack,.toast,.camera-tools[open] .camera-more",
    )) {
      current.add(e);
      const r = e.getBoundingClientRect();
      if (r.width && r.height && getComputedStyle(e).display !== "none")
        excluded.push({
          x: r.left,
          y: r.top,
          width: r.width,
          height: r.height,
        });
    }
    for (const e of observed)
      if (!current.has(e)) {
        observer.unobserve(e);
        observed.delete(e);
      }
    for (const e of current)
      if (!observed.has(e)) {
        observer.observe(e);
        observed.add(e);
      }
    dirty = false;
  }
  function update(camera: T.Camera, shown: boolean) {
    if (dirty) measure();
    const taken = [...excluded],
      width = host.clientWidth,
      height = host.clientHeight;
    for (const node of nodes) {
      const [x, z] = node.id === 0 ? [16, -23.5] : POND_POSITIONS[node.id - 1],
        v = new T.Vector3(x, 1.3, z - 3.5).project(camera);
      const budget =
        width < 700 ||
        !!document.querySelector(".ui-drawer") ||
        taken.reduce((n, b) => n + b.width * b.height, 0) +
          node.width * node.height <
          width * height * 0.295;
      const box =
        shown && budget && v.z > 0 && v.z < 1 && !host.closest("[inert]")
          ? placeLabel(
              { x: ((v.x + 1) * width) / 2, y: ((1 - v.y) * height) / 2 },
              node,
              { width, height },
              taken,
            )
          : null;
      const button = node.element;
      button.style.visibility = box ? "visible" : "hidden";
      button.tabIndex = box ? 0 : -1;
      button.setAttribute("aria-hidden", String(!box));
      if (box) {
        button.style.transform = `translate(${box.x.toFixed(1)}px,${box.y.toFixed(1)}px)`;
        // Point the pin's tail at its anchor whether the label sits above or below it.
        button.dataset.placement =
          box.y + box.height / 2 < ((1 - v.y) * height) / 2 ? "above" : "below";
        taken.push(box);
      }
    }
  }
  return {
    update,
    dispose() {
      observer.disconnect();
      mutations.disconnect();
    },
  };
}
