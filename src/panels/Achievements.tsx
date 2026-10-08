import { Award, Check, LockKeyhole, Sprout, Armchair } from "lucide-react";
import { ACHIEVEMENT_IDS, type Profile } from "../state/profile";
import { number } from "../ui/format";
import { t, type MessageKey } from "../i18n";
export function Achievements({ profile }: { profile: Profile }) {
  return (
    <section aria-label={t("achievements.title")} className="achievements">
      <p>
        <Award size={20} />
        {t("achievements.count", profile.earned.length)}
      </p>
      <div className="achievement-grid">
        {ACHIEVEMENT_IDS.map((id) => {
          const earned = profile.earned.find((e) => e.id === id);
          return (
            <details key={id} className="achievement" data-achievement={id}>
              <summary
                aria-label={`${t(`achievement.${id}.title` as MessageKey)} · ${t(earned ? "achievements.unlocked" : "achievements.locked")}`}
              >
                {earned ? <Check size={18} /> : <LockKeyhole size={18} />}
                <span>{t(`achievement.${id}.title` as MessageKey)}</span>
              </summary>
              <p>{t(`achievement.${id}.detail` as MessageKey)}</p>
              <span className="hint">
                {earned
                  ? t(
                      earned.imported
                        ? "achievements.imported"
                        : "achievements.earned",
                      number(earned.observedDay),
                    )
                  : t("achievements.locked")}
              </span>
            </details>
          );
        })}
      </div>
      {profile.earned.some((e) => e.id === "paid") && (
        <p>
          <Sprout size={18} />
          {t("rewards.garden")}
        </p>
      )}
      {profile.earned.some((e) => e.id === "cold") && (
        <p>
          <Armchair size={18} />
          {t("rewards.bench")}
        </p>
      )}
      <p className="hint">{t("rewards.note")}</p>
      <p className="hint">{t("achievements.note")}</p>
    </section>
  );
}
