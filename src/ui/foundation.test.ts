import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

it("maintient les nouvelles couleurs dans les jetons et interdit les tailles px dispersées", () => {
  const directory = new URL(".", import.meta.url);
  const css = readdirSync(directory).filter(f => f.endsWith(".css"));
  for (const name of css.filter(f => f !== "tokens.css")) {
    const source = readFileSync(new URL(name, directory), "utf8");
    expect(source, name).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(source, name).not.toContain("!important");
  }
  for (const name of ["styles.css", "realism.css", "progression.css"]) {
    const source = readFileSync(new URL(`../${name}`, directory), "utf8");
    expect(source, name).not.toMatch(/font-size:\s*\d+(?:\.\d+)?px/);
    expect(source, name).not.toMatch(/font:[^;]*\d+(?:\.\d+)?px/);
  }
});
