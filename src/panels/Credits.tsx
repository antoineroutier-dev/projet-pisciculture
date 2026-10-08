import { t, displayText } from "../i18n";
import react from "../../docs/licenses/React-MIT.txt?raw";
import inter from "../../docs/licenses/Inter-OFL.txt?raw";
import fraunces from "../../docs/licenses/Fraunces-OFL.txt?raw";
import lucide from "../../docs/licenses/Lucide-ISC.txt?raw";
import three from "../../docs/licenses/Three-MIT.txt?raw";
export function Credits() {
  return (
    <div className="credits">
      <p>{t("m_13225ec08c")}</p>
      <p>{t("m_26de9c62ff")}</p>
      <dl>
        <dt>{t("m_30a4a5bca8")}</dt>
        <dd>{t("m_189217cb84")}</dd>
        <dt>{t("m_b8eeae90c9")}</dt>
        <dd>{t("m_9770b83037")}</dd>
        <dt>{t("m_410f0fb294")}</dt>
        <dd>{t("m_6997860552")}</dd>
        <dt>{t("m_86f64e11e0")}</dt>
        <dd>{t("m_4582cf395e")}</dd>
        <dt>{t("m_01fad993ff")}</dt>
        <dd>{t("m_281c082c10")}</dd>
      </dl>
      {[
        [t("m_eed853f7a8"), inter],
        [t("m_beaec53048"), fraunces],
        [t("m_4ef9e63c7e"), lucide],
        ["Three.js · MIT", three],
        [t("m_635be147c3"), react],
      ].map(([name, license]) => (
        <details key={name}>
          <summary>
            {t("m_f3ec8e880a") + " "}
            {displayText(name)}
          </summary>
          <pre>{license}</pre>
        </details>
      ))}
    </div>
  );
}
