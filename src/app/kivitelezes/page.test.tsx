import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/projects/organization", () => ({ getProjectOrganization: vi.fn() }));
vi.mock("@/features/execution/execution-data", () => ({ getExecutionOverviewForOrganization: vi.fn() }));
vi.mock("@/components/navigation/guarded-link", () => ({ GuardedLink: ({ href, children, ...props }: { href: string; children: React.ReactNode } & Record<string, unknown>) => <a href={href} {...props}>{children}</a> }));

import { getExecutionOverviewForOrganization } from "@/features/execution/execution-data";
import { getProjectOrganization } from "@/features/projects/organization";
import ExecutionIndexPage from "./page";

const organization = { id: "org", name: "DEMO műhely", role: "owner" as const };
const emptySearch = { organization: "org" };
const plan = { id: "plan", projectId: null, title: "DEMO munkanapló", updatedAt: "2026-10-25T10:00:00Z", journalCount: 0, photoCount: 0, tasks: { total: 0, done: 0, inProgress: 0, todo: 0, nextTasks: [] } };

describe("ExecutionIndexPage empty and populated states", () => {
  beforeEach(() => {
    vi.mocked(getProjectOrganization).mockResolvedValue({ auth: { userId: "user", email: null, displayName: null, organizations: [organization] }, organization, needsSelection: false });
  });

  it("describes standalone or saved-calculation entry without promising survey creation", async () => {
    vi.mocked(getExecutionOverviewForOrganization).mockResolvedValue([]);
    const html = renderToStaticMarkup(await ExecutionIndexPage({ searchParams: Promise.resolve(emptySearch) }));
    expect(html).toContain("Munkanaplót önállóan vagy mentett kalkulációból indíthatsz.");
    expect(html).not.toContain("felmérésből");
    expect(html).toContain('href="/kivitelezes/uj?organization=org"');
  });

  it("keeps the populated list and its existing plan route unchanged", async () => {
    vi.mocked(getExecutionOverviewForOrganization).mockResolvedValue([plan]);
    const html = renderToStaticMarkup(await ExecutionIndexPage({ searchParams: Promise.resolve(emptySearch) }));
    expect(html).toContain("DEMO munkanapló");
    expect(html).toContain('href="/kivitelezes/plan?organization=org"');
    expect(html).not.toContain("Még nincs munkanapló");
  });
});
