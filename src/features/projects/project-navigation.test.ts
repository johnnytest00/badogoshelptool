import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExecutionSection, ExecutionSubsection, closeNestedExecutionDisclosures } from "@/features/execution/execution-section";
import { ProjectCalculatorLinks } from "./project-calculator-links";

describe("project overview navigation and execution disclosures", () => {
  it("links all three calculators with the current project and organization", () => {
    const html = renderToStaticMarkup(createElement(ProjectCalculatorLinks, { projectId: "project-1", organizationId: "shop-2" }));

    expect(html).toContain("/projektek/project-1/ereszcsatorna?organization=shop-2");
    expect(html).toContain("/projektek/project-1/szegelyek?organization=shop-2");
    expect(html).toContain("/projektek/project-1/lemezprofilok?organization=shop-2");
    expect(html).toContain("Ereszcsatorna-kalkulátor");
    expect(html).toContain("Bádogos szegélyek kalkulátora");
    expect(html).toContain("Lemezprofilok és hajtások");
  });

  it("renders execution and its two independently closed subsections collapsed", () => {
    const html = renderToStaticMarkup(createElement(ExecutionSection, {
      children: createElement("div", null,
        createElement(ExecutionSubsection, { title: "Dokumentáció", children: "Fotók és jelentés" }),
        createElement(ExecutionSubsection, { title: "Munkanapló", children: "Bejegyzések" }),
      ),
    }));

    expect(html).toContain("<details id=\"kivitelezes\" class=\"project-execution-disclosure\">");
    expect(html).toContain("<h2>Kivitelezés</h2>");
    expect(html.match(/<details class="execution-nested-disclosure">/g)).toHaveLength(2);
    expect(html).toContain("<summary>Dokumentáció</summary>");
    expect(html).toContain("<summary>Munkanapló</summary>");
    expect(html).not.toContain("<details class=\"project-execution-disclosure\" open");
    expect(html).not.toContain("execution-nested-disclosure\" open");
  });

  it("closes both nested disclosures when the execution section closes", () => {
    const children = [{ open: true }, { open: true }];
    const root = { querySelectorAll: () => children } as unknown as Pick<HTMLDetailsElement, "querySelectorAll">;

    closeNestedExecutionDisclosures(root);

    expect(children.map(({ open }) => open)).toEqual([false, false]);
  });
});
