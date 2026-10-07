import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { PANELS, type PanelId } from "../state/navigation";

/** Non-modal: the clock, objective and dock stay available to the keyboard. */
export function ManagementPanel({id, close, children}: {id:PanelId; close:()=>void; children:ReactNode}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    heading.current?.focus({preventScroll:true});
    if (content.current) content.current.scrollTop = 0;
  }, [id]);
  return <section className="management-panel" id="management-panel" aria-labelledby="panel-heading" data-panel-id={id}>
    <header className="management-heading">
      <h2 id="panel-heading" ref={heading} tabIndex={-1}>{PANELS.find(p=>p.id===id)!.label}</h2>
      <button onClick={close} aria-label="Fermer le panneau" title="Fermer · Échap"><X size={20}/></button>
    </header>
    <div className="management-content" ref={content} tabIndex={0} role="region" aria-label="Contenu du panneau">{children}</div>
  </section>;
}
