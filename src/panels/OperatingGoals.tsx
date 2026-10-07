import { Badge, Card, Gauge } from "../ui/Primitives";
import { operatingGoals } from "../state/operatingGoals";
import { number, type Game } from "../game";
export function OperatingGoals({ game }: { game: Game }) {
  return (
    <section className="operating-goals" aria-label="Objectifs d’exploitation">
      <h3>Développez votre domaine</h3>
      {operatingGoals(game).map((goal) => (
        <Card key={goal.id}>
          <h4>{goal.title}</h4>
          <p>{goal.text}</p>
          {goal.done ? (
            <Badge tone="success">Objectif atteint</Badge>
          ) : (
            <Gauge
              value={goal.progress}
              max={goal.target}
              label={goal.title}
              caption={`${number(goal.progress, goal.unit === "kg" ? 1 : 0)} / ${number(goal.target)} ${goal.unit}`}
            />
          )}
        </Card>
      ))}
    </section>
  );
}
