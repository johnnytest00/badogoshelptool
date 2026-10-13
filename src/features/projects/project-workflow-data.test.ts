/* eslint-disable @typescript-eslint/no-explicit-any -- Minimal fluent Supabase query double for verifying tenant filters. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const queries: Array<{ table: string; filters: Array<[string, string, string]> }> = [];
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      const query = { table, filters: [] as Array<[string, string, string]> };
      queries.push(query);
      const builder: any = {
        select: () => builder,
        eq: (column: string, value: string) => { query.filters.push(["eq", column, value]); return builder; },
        order: async () => ({ data: [], error: null }),
        then: (resolve: (value: { data: never[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return builder;
    },
  }),
}));

import { getProjectWorkflowRecords } from "./project-workflow-overview";

describe("projekt workflow adatlekérdezés", () => {
  beforeEach(() => { queries.length = 0; });

  it("minden modul adatát a kiválasztott szervezethez és projekthez szűri", async () => {
    await getProjectWorkflowRecords("org-authorized", "project-visible");
    expect(queries).toHaveLength(3);
    for (const query of queries) {
      expect(query.filters).toContainEqual(["eq", "organization_id", "org-authorized"]);
      expect(query.filters).toContainEqual(["eq", "project_id", "project-visible"]);
    }
  });
});
