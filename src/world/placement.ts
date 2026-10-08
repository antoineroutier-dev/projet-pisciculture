export type Box = { x: number; y: number; width: number; height: number };
export function overlap(a: Box, b: Box, gap = 6) {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}
/** Keep world labels close to their anchor and out of the interface. Never cover another label. */
export function placeLabel(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  excluded: Box[],
): Box | null {
  for (const dy of [-size.height - 14, 10, -size.height - 54, 50]) {
    const box = { x: anchor.x - size.width / 2, y: anchor.y + dy, ...size };
    if (
      box.x < 8 ||
      box.y < 8 ||
      box.x + box.width > viewport.width - 8 ||
      box.y + box.height > viewport.height - 8
    )
      continue;
    if (!excluded.some((b) => overlap(box, b))) return box;
  }
  return null;
}
