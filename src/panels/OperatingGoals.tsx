import { number } from "../ui/format";
import { t, displayText } from "../i18n";
import { Badge, Card, Gauge } from "../ui/Primitives";
import { operatingGoals } from "../state/operatingGoals";
import { type Game } from "../game";
export function OperatingGoals({ game }: { game: Game }) {
  return (
    <section className="operating-goals" aria-label={t("m_d7431da3ca")}>
      <h3>{t("m_bca5c1cb04")}</h3>
      {operatingGoals(game).map((goal) => (
        <Card key={goal.id}>
          <h4>{displayText(goal.title)}</h4>
          <p>{displayText(goal.text)}</p>
          {goal.done ? (
            <Badge tone="success">{t("m_8e11f9ae38")}</Badge>
          ) : (
            <Gauge
              value={goal.progress}
              max={goal.target}
              label={displayText(goal.title)}
              caption={displayText(
                `${number(goal.progress, goal.unit === "kg" ? 1 : 0)} / ${number(goal.target)} ${goal.unit}`,
              )}
            />
          )}
        </Card>
      ))}
    </section>
  );
}
