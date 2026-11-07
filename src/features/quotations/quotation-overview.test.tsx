import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }));
vi.mock("@/components/navigation/guarded-link", () => ({
  GuardedLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a>,
}));
vi.mock("./standalone-quotation-actions", () => ({ listStandaloneQuotationsAction: vi.fn() }));

import { QuotationOverview } from "./quotation-overview";

describe("quotation overview title hierarchy", () => {
  it("keeps the page header and standalone list on one surface", () => {
    const html = renderToStaticMarkup(
      <QuotationOverview organizationId="demo-org" projectItems={[]} projectHasMore={false} projectError="" />,
    );

    expect(html).toContain("quotation-overview-primary-surface");
    expect(html).not.toContain("Önálló ajánlatok");
    expect(html).toContain("Projektajánlatok");
    expect(html).not.toContain("Projekt nélküli");
    expect(html).not.toContain("Meglévő munkák");
    expect(html).not.toContain("class=\"status-pill\">Piszkozat");
    expect(html.match(/class="glass-section-header"/g)).toHaveLength(1);
  });
});
