import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/navigation/guarded-link", () => ({
  GuardedLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a>,
}));
vi.mock("./standalone-quotation-actions", () => ({ listStandaloneQuotationsAction: vi.fn() }));

import { QuotationOverview } from "./quotation-overview";

describe("quotation overview title hierarchy", () => {
  it("shows only the section titles inside glass bubbles", () => {
    const html = renderToStaticMarkup(
      <QuotationOverview organizationId="demo-org" projectItems={[]} projectHasMore={false} projectError="" />,
    );

    expect(html).toContain("Önálló ajánlatok");
    expect(html).toContain("Projektajánlatok");
    expect(html).not.toContain("Projekt nélküli");
    expect(html).not.toContain("Meglévő munkák");
    expect(html).not.toContain("class=\"status-pill\">Piszkozat");
    expect(html.match(/class="glass-section-header"/g)).toHaveLength(2);
  });
});
