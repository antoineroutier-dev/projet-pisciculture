import { displayText } from "../i18n";
import type { ReactNode } from "react";
import { PANELS, type PanelId } from "../state/navigation";
import { Drawer } from "../ui/Primitives";
import {
  BookOpen,
  CircleHelp,
  Coins,
  Hammer,
  Package,
  Waves,
} from "lucide-react";
const ICONS = {
  project: Hammer,
  ponds: Waves,
  logistics: Package,
  finance: Coins,
  journal: BookOpen,
  guide: CircleHelp,
} as const;
export function ManagementPanel({
  id,
  close,
  children,
  summary,
}: {
  id: PanelId;
  close: () => void;
  children: ReactNode;
  summary?: ReactNode;
}) {
  const Icon = ICONS[id as keyof typeof ICONS];
  return (
    <Drawer
      id={id}
      icon={Icon && <Icon size={20} />}
      title={displayText(PANELS.find((p) => p.id === id)!.label)}
      close={close}
      summary={summary}
    >
      {displayText(children)}
    </Drawer>
  );
}
