/** Read once per material creation; the source of truth is tokens.css. */
const cache = new Map<string, string>();
export function paint(name: string) {
  let color = cache.get(name);
  if (!color) {
    color = getComputedStyle(document.documentElement)
      .getPropertyValue(`--paint-${name}`)
      .trim();
    if (!color) throw new Error(`Missing world palette token: ${name}`);
    cache.set(name, color);
  }
  return color;
}
