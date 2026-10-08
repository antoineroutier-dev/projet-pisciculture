import type { AchievementId } from "./state/profile";
/** A future desktop host may implement this interface. Web never contacts a platform. */
export interface Platform {
  readonly kind: "web" | "desktop";
  unlockAchievement(id: AchievementId): Promise<void>;
  readCloudSave(): Promise<string | null>;
  writeCloudSave(raw: string): Promise<void>;
}
export const platform: Platform = {
  kind: "web",
  async unlockAchievement() {},
  async readCloudSave() {
    return null;
  },
  async writeCloudSave() {},
};
