import Link from "next/link";
import { Calculator, Ruler, Waves } from "lucide-react";

type Props = { projectId: string; organizationId: string };

export function ProjectCalculatorLinks({ projectId, organizationId }: Props) {
  const query = `?organization=${organizationId}`;
  return (
    <section className="detail-surface project-calculator-section" aria-labelledby="project-calculators-title">
      <div className="roof-list-heading">
        <div>
          <p className="section-eyebrow">Projektmunkaterület</p>
          <h2 id="project-calculators-title">Kalkulátorok</h2>
        </div>
      </div>
      <div className="project-calculator-grid">
        <CalculatorLink href={`/projektek/${projectId}/ereszcsatorna${query}`} icon={<Waves aria-hidden="true" />} title="Ereszcsatorna-kalkulátor" description="Szakaszok, lefolyók és kézi tartozékok becslése." />
        <CalculatorLink href={`/projektek/${projectId}/szegelyek${query}`} icon={<Calculator aria-hidden="true" />} title="Bádogos szegélyek kalkulátora" description="Szegélyszakaszok, revíziók és anyagkimutatás-draft." />
        <CalculatorLink href={`/projektek/${projectId}/lemezprofilok${query}`} icon={<Ruler aria-hidden="true" />} title="Lemezprofilok és hajtások" description="Profil szerkesztése és előzetes nettó blankterület." />
      </div>
    </section>
  );
}

function CalculatorLink({ href, icon, title, description }: Readonly<{ href: string; icon: React.ReactNode; title: string; description: string }>) {
  return (
    <Link className="project-calculator-link" href={href}>
      <span className="future-module-icon">{icon}</span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="project-calculator-open">Megnyitás</span>
    </Link>
  );
}
