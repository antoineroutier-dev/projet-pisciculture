import { Button } from "./ui/Button";
import { number } from "./ui/format";
import { t, displayText } from "./i18n";
import { useControlPreferences } from "./state/preferences";
import { bindingLabel } from "./controls/bindings";
import { Card, Tabs } from "./ui/Primitives";
import { useState } from "react";
import { SpeciesPortrait } from "./world/SpeciesPortrait";
import { SPECIES } from "./game";
import {
  SCIENCE_TERMS,
  scienceText,
  type ScienceTerm,
} from "./ui/ScientificHelp";
import {
  BookOpen,
  Droplets,
  Fish,
  Clock3,
  Package,
  ShieldCheck,
  Landmark,
  Info,
  ExternalLink,
  Eye,
  Thermometer,
} from "lucide-react";
export default function RealismGuide({
  replayTutorial,
  achievements,
}: {
  replayTutorial: () => void;
  achievements: () => void;
}) {
  const { bindings } = useControlPreferences();
  const [tab, setTab] = useState<"practice" | "species" | "water" | "model">(
    "practice",
  );
  const sections = [
    {
      icon: <BookOpen />,
      title: t("m_5112d4a651"),
      text: t("m_d7d099864d"),
    },
    {
      icon: <Landmark />,
      title: t("m_0c9e33b461"),
      text: t("m_1e4759d9fa"),
    },
    {
      icon: <Clock3 />,
      title: t("m_c37a9fbb22"),
      text: t("m_917d62618d"),
    },
    {
      icon: <Thermometer />,
      title: t("m_c205c2a366"),
      text: t("m_8b9759158f"),
    },
    {
      icon: <Package />,
      title: t("m_07866c7ebd"),
      text: t("m_c6c50a2ddd"),
    },
    {
      icon: <Droplets />,
      title: t("m_924e593b48"),
      text: t("m_b6d976b815"),
    },
    {
      icon: <ShieldCheck />,
      title: t("m_e341545f97"),
      text: t("m_2d3cf29831"),
    },
    {
      icon: <Fish />,
      title: t("m_223145f9e6"),
      text: t("m_cca898ca68"),
    },
    {
      icon: <Landmark />,
      title: t("m_deab627888"),
      text: t("m_da1348360d"),
    },
    {
      icon: <Eye />,
      title: t("m_a675889d4c"),
      text: t("m_561ccecf96"),
    },
  ];
  const article = (i: number) => (
    <details className="guide-article" key={sections[i].title}>
      <summary>
        {sections[i].icon}
        <span>{displayText(sections[i].title)}</span>
      </summary>
      <p>{displayText(sections[i].text)}</p>
      {i === 2 && (
        <p className="hint">
          {displayText(bindingLabel(bindings.toggle))}
          {" " + t("m_3bbb473b11")}
          {displayText(" ")}
          {displayText(
            [
              bindings.pause,
              bindings.speed1,
              bindings.speed2,
              bindings.speed4,
              bindings.speed8,
            ]
              .map(bindingLabel)
              .join(" / "),
          )}
          {displayText(" ")}
          {t("m_b50b2c0449")}
        </p>
      )}
    </details>
  );
  return (
    <div className="guide-content">
      <Tabs
        label={t("m_0a58715e11")}
        value={tab}
        onChange={setTab}
        items={[
          { id: "practice", label: t("m_460ad6a124") },
          { id: "species", label: t("m_351f789647") },
          { id: "water", label: t("m_3af905054f") },
          { id: "model", label: t("m_37c07ac587") },
        ]}
      >
        {tab === "practice" && (
          <div className="guide-articles">
            <div className="button-row">
              <Button tone="secondary" onClick={replayTutorial}>
                {t("tutorial.replay")}
              </Button>
              <Button tone="secondary" onClick={achievements}>
                {t("achievements.title")}
              </Button>
            </div>
            <svg
              className="guide-illustration"
              viewBox="0 0 320 90"
              role="img"
              aria-label={t("m_701862447b")}
            >
              <path
                d="M0 75Q45 25 90 65T190 50T320 60V90H0Z"
                fill="var(--surface-muted)"
              />
              <path
                d="M10 60Q90 80 140 62T300 62"
                stroke="var(--water)"
                strokeWidth="6"
                fill="none"
              />
              <path
                d="M30 48V25H84V52M156 52V20H208V52M251 49V15H297V53"
                fill="var(--surface-raised)"
                stroke="var(--primary)"
                strokeWidth="3"
              />
            </svg>
            {[0, 1, 2, 6, 7, 8].map(article)}
          </div>
        )}
        {tab === "species" && (
          <div className="guide-articles">
            {Object.values(SPECIES).map((s) => (
              <Card className="guide-species" key={s.id}>
                <SpeciesPortrait species={s.id} />
                <h3>{displayText(s.name)}</h3>
                <p>
                  {displayText(
                    s.id === "trout"
                      ? t("m_e902fe7a25")
                      : s.id === "carp"
                        ? t("m_b2170e7736")
                        : t("m_f63587739a"),
                  )}
                </p>
                <small>
                  {displayText(s.temperature.join("–"))}
                  {" " + t("m_07b8d85717") + " "}
                  {number(s.minOxygen, 2)}
                  {" " + t("m_cf6796e24b") + " "}
                  {displayText(number(s.fcr, 2))}
                </small>
              </Card>
            ))}
            {[3, 9].map(article)}
          </div>
        )}
        {tab === "water" && (
          <div className="guide-articles">
            <p>{t("m_87dc76ff11")}</p>
            {(Object.keys(SCIENCE_TERMS) as ScienceTerm[]).map((term) => (
              <details className="guide-article" key={term}>
                <summary>
                  <Droplets size={20} />
                  <span>{displayText(SCIENCE_TERMS[term].label)}</span>
                </summary>
                <p>{displayText(scienceText(term))}</p>
              </details>
            ))}
            {[4, 5].map(article)}
          </div>
        )}
        {tab === "model" && (
          <>
            <section className="research-card">
              <span className="section-kicker">{t("m_cc7d18afc7")}</span>
              <h2>{t("m_37c07ac587")}</h2>
              <p>{t("m_24a722c373")}</p>
              <p>{t("m_641c33eca3")}</p>
              <p>{t("m_688934e082")}</p>
              <p>{t("m_8e159b5e0a")}</p>
              <div className="research-links">
                <a
                  href="https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/flush_water.R"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("m_6c3fa61b4f") + " "}
                  <ExternalLink size={12} />
                </a>
                <a
                  href="https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/Q10.R"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("m_83d6f4dd7d") + " "}
                  <ExternalLink size={12} />
                </a>
                <a
                  href="https://www.fao.org/4/i2125e/i2125e.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("m_7ac8c26de3") + " "}
                  <ExternalLink size={12} />
                </a>
              </div>
              <p className="simulation-note">
                <Info size={17} />
                {" " + t("m_faea88c62d")}
              </p>
            </section>
            <p className="model-limit">{t("m_f23b0d2cdb")}</p>
          </>
        )}
      </Tabs>
    </div>
  );
}
