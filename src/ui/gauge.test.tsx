import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Gauge } from "./Primitives";
it("expose les traces d’ammoniac sans notation exponentielle interdite en ARIA", () => {
  const markup = (value: number) =>
    renderToStaticMarkup(
      <Gauge value={value} max={0.04} label="NH₃-N" caption="Bon" />,
    );
  expect(markup(3.0013585520835014e-57)).toContain('aria-valuenow="0"');
  expect(markup(0.00012345)).toContain('aria-valuenow="0.000123"');
  expect(markup(0.1)).toContain('aria-valuenow="0.04"');
});
