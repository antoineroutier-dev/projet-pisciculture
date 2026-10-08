import { expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
it("centralise la palette UI et supprime les trois feuilles concurrentes", () => {
  const root = path.resolve("src");
  function scan(dir: string) {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, file.name);
      if (file.isDirectory()) scan(full);
      else if (file.name.endsWith(".css") && file.name !== "tokens.css") {
        const source = readFileSync(full, "utf8");
        expect(source, full).not.toMatch(/#[\da-f]{3,8}\b/i);
        expect(source, full).not.toContain("!important");
        expect(source, full).not.toMatch(/font-size:\s*\d+(?:\.\d+)?px/);
      } else if (/\.tsx?$/.test(file.name) && !file.name.endsWith(".test.ts") && file.name !== "game.ts") {
        // The three immutable species identity colors in game.ts are the only exception.
        expect(readFileSync(full, "utf8"), full).not.toMatch(/#[\da-f]{3,8}\b/i);
      }
    }
  }
  scan(root);
  for (const file of ["styles.css", "realism.css", "progression.css"])
    expect(existsSync(path.join(root, file))).toBe(false);
});
