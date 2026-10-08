import react from "../../docs/licenses/React-MIT.txt?raw";
import inter from "../../docs/licenses/Inter-OFL.txt?raw";
import fraunces from "../../docs/licenses/Fraunces-OFL.txt?raw";
import lucide from "../../docs/licenses/Lucide-ISC.txt?raw";
import three from "../../docs/licenses/Three-MIT.txt?raw";
export function Credits() {
  return (
    <div className="credits">
      <p>Les Étangs — projet de simulation de pisciculture.</p>
      <p>
        Poissons, bâtiments, végétation, portraits, carte, effets et sons
        synthétisés : créations originales du projet. Tout est intégré au jeu.
      </p>
      <dl>
        <dt>Inter</dt>
        <dd>Rasmus Andersson et The Inter Project Authors · OFL 1.1</dd>
        <dt>Fraunces</dt>
        <dd>Undercase Type et The Fraunces Project Authors · OFL 1.1</dd>
        <dt>Lucide</dt>
        <dd>Lucide Contributors · ISC</dd>
        <dt>Three.js</dt>
        <dd>Three.js Authors · MIT</dd>
        <dt>React</dt>
        <dd>Meta Platforms, Inc. and affiliates · MIT</dd>
      </dl>
      {[
        ["Inter · OFL", inter],
        ["Fraunces · OFL", fraunces],
        ["Lucide · ISC", lucide],
        ["Three.js · MIT", three],
        ["React · MIT", react],
      ].map(([name, license]) => (
        <details key={name}>
          <summary>Licence {name}</summary>
          <pre>{license}</pre>
        </details>
      ))}
    </div>
  );
}
