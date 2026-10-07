import type { ReactNode } from "react";
import { PANELS, type PanelId } from "../state/navigation";
import { Drawer } from "../ui/Primitives";
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
  return (
    <Drawer
      id={id}
      title={PANELS.find((p) => p.id === id)!.label}
      close={close}
      summary={summary}
    >
      {children}
    </Drawer>
  );
}
