import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ExecutionLinkedSurveys } from "./execution-linked-surveys";
import type { ExecutionLinkedSurveysResult } from "./execution-data";

describe("linked survey reliability states", () => {
  it("renders a retryable unavailable state without claiming there are no surveys", () => {
    const html = renderToStaticMarkup(<ExecutionLinkedSurveys organizationId="org" result={{ status: "unavailable" }} />);

    expect(html).toContain("A kapcsolt felmérések átmenetileg nem tölthetők be.");
    expect(html).toContain("Újrapróbálás");
    expect(html).not.toContain("Ehhez a munkanaplóhoz még nincs felmérés csatolva.");
  });

  it("hides the retired survey section when nothing is linked (M5)", () => {
    expect(renderToStaticMarkup(<ExecutionLinkedSurveys organizationId="org" result={{ status: "loaded", items: [] }} />)).toBe("");
  });

  it("keeps an access-denied result explicit", () => {
    const html = renderToStaticMarkup(<ExecutionLinkedSurveys organizationId="org" result={{ status: "access_denied" }} />);

    expect(html).toContain("Nincs hozzáférés a munkanaplóhoz kapcsolt felmérésekhez.");
    expect(html).not.toContain("Ehhez a munkanaplóhoz még nincs felmérés csatolva.");
  });

  it("renders valid linked surveys beside a corrupted sibling warning", () => {
    const result: ExecutionLinkedSurveysResult = {
      status: "loaded",
      items: [
        {
          status: "available",
          id: "valid-link",
          surveyId: "survey-id",
          surveyVersion: 2,
          currentVersion: 3,
          revisionId: "revision-id",
          sections: [{ id: "00000000-0000-4000-8000-000000000001", name: "Eresz", workType: "gutter", measurements: [], notes: "", photoIds: [] }],
          notes: null,
          photos: [],
        },
        { status: "unavailable", linkId: "broken-link", reason: "invalid_snapshot" },
      ],
    };

    const html = renderToStaticMarkup(<ExecutionLinkedSurveys organizationId="org" result={result} />);

    expect(html).toContain("Eresz");
    expect(html).toContain("Egy kapcsolt felmérés mentett változata hibás vagy nem támogatott");
    expect(html).not.toContain("Ehhez a munkanaplóhoz még nincs felmérés csatolva.");
  });
});
