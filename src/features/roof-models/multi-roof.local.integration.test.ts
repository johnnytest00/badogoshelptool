import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it, vi } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { calculateGableRoof, type GableRoofInput } from "@/domain/calculations/gable-roof";

vi.mock("server-only", () => ({}));
import { persistRoofGeometry, persistStandaloneRoofGeometry, registerSurveyMultiRoofSource } from "@/infrastructure/supabase/roof-geometry-writer";
import { persistGableRoof } from "@/infrastructure/supabase/gable-roof-writer";

const localDescribe = process.env.RUN_LOCAL_MULTI_ROOF_TESTS === "1" ? describe : describe.skip;
const organizationId = "00000000-0000-4000-8000-000000000010";
const actorId = "00000000-0000-4000-8000-000000000001";
const adminConfig = { host: "127.0.0.1", port: 54322, user: "postgres", password: "postgres", database: "postgres" };
const input = (pitchDegrees: number): RoofGeometryInput => ({ type: "hip", lengthMm: 10000, widthMm: 6000, pitchDegrees });

localDescribe("F9.10 local roof geometry persistence", () => {
  it("closes the legacy gable RPC and keeps server-recomputed revision writes exact", async () => {
    if (!process.env.COVERING_WRITER_DATABASE_URL?.includes("@127.0.0.1:54322/")) throw new Error("Only a configured local writer is allowed");
    const admin = new Client(adminConfig);
    await admin.connect();
    const projectId = randomUUID(), roofModelId = randomUUID(), operationId = randomUUID();
    const geometryInput: GableRoofInput = { inputMode: "height", buildingLengthMm: 12000, buildingWidthMm: 8000,
      roofRiseMm: 3000, eaveOverhangMm: 500, frontGableOverhangMm: 250, rearGableOverhangMm: 250 };
    await admin.query("insert into public.projects(id,organization_id,name,project_type,status,created_by) values($1,$2,'DEMO F9.10 nyeregtető','roof_renovation','draft',$3)", [projectId, organizationId, actorId]);
    try {
      const oldPrivilege = await admin.query("select has_function_privilege('authenticated','public.save_gable_roof_calculation(uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,integer)','EXECUTE') as allowed");
      expect(oldPrivilege.rows[0].allowed).toBe(false);
      const request = { organizationId, projectId, roofModelId, operationId, expectedRevisionNumber: 0, name: "DEMO nyeregtető",
        input: geometryInput, output: calculateGableRoof(geometryInput), provenance: { input: "user_provided", output: "server_recomputed" }, actorId };
      const saved = await persistGableRoof(request);
      expect(saved.revision_number).toBe(1);
      expect((await persistGableRoof(request)).calculation_revision_id).toBe(saved.calculation_revision_id);
      await expect(persistGableRoof({ ...request, operationId: randomUUID(), expectedRevisionNumber: 0 })).rejects.toMatchObject({ code: "40001" });
      const history = await admin.query("select r.input_data,cr.output_snapshot from public.roof_model_revisions r join public.calculation_dependencies d on d.upstream_roof_model_revision_id=r.id join public.calculation_revisions cr on cr.id=d.downstream_calculation_revision_id where r.id=$1", [saved.roof_model_revision_id]);
      expect(history.rows[0].input_data).toEqual(geometryInput);
      expect(history.rows[0].output_snapshot.areas.combinedRoofM2).toBe(140.625);
      await admin.query("begin");
      await admin.query("set local role authenticated");
      await admin.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId]);
      await expect(admin.query("insert into public.roof_models(id,organization_id,project_id,name,roof_type) values($1,$2,$3,'DEMO hamis nyeregtető','gable')", [randomUUID(), organizationId, projectId])).rejects.toMatchObject({ code: "42501" });
      await admin.query("rollback");
    } finally { await admin.query("rollback").catch(() => undefined); await admin.end(); }
  }, 30_000);
  it("keeps source revisions, authorization, concurrency and retries exact", async () => {
    if (!process.env.COVERING_WRITER_DATABASE_URL?.includes("@127.0.0.1:54322/")) throw new Error("Only a configured local writer is allowed");
    const admin = new Client(adminConfig);
    await admin.connect();
    const projectId = randomUUID(), roofModelId = randomUUID(), operationId = randomUUID();
    await admin.query("insert into public.projects(id,organization_id,name,project_type,status,created_by) values($1,$2,'DEMO F9.10 tetőgeometria','roof_renovation','draft',$3)", [projectId, organizationId, actorId]);
    const request = (geometryInput: RoofGeometryInput, op: string, expected: number) => ({ organizationId, projectId, roofModelId, operationId: op, expectedRevisionNumber: expected, name: "DEMO kontytető", input: geometryInput, output: calculateRoofGeometry(geometryInput), actorId });
    try {
      const first = await persistRoofGeometry(request(input(45), operationId, 0));
      expect(first.revision_number).toBe(1);
      const opened = await admin.query("select m.roof_type,r.input_data,c.calculator_type,cr.output_snapshot from public.roof_models m join public.roof_model_revisions r on r.id=m.current_revision_id join public.calculations c on c.roof_model_id=m.id join public.calculation_revisions cr on cr.id=c.current_revision_id where m.id=$1", [roofModelId]);
      expect(opened.rows[0].roof_type).toBe("hip");
      expect(opened.rows[0].input_data).toEqual(input(45));
      expect(opened.rows[0].calculator_type).toBe("roof.geometry.hip");
      expect(opened.rows[0].output_snapshot.totalAreaMm2).toBeCloseTo(60e6 * Math.SQRT2, 3);

      const denied = await admin.query("select has_function_privilege('authenticated','public.save_roof_geometry_calculation(uuid,uuid,uuid,uuid,integer,text,jsonb,jsonb,uuid)','EXECUTE') as can_execute");
      expect(denied.rows[0].can_execute).toBe(false);
      const direct = new Client(adminConfig);
      await direct.connect();
      try {
        await direct.query("begin");
        await direct.query("set local role authenticated");
        await direct.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId]);
        await expect(direct.query("insert into public.roof_models(id,organization_id,project_id,name,roof_type) values($1,$2,$3,'DEMO hamis közvetlen tető','hip')", [randomUUID(), organizationId, projectId])).rejects.toMatchObject({ code: "42501" });
      } finally { await direct.query("rollback"); await direct.end(); }

      await expect(persistRoofGeometry({ ...request(input(45), randomUUID(), 0), organizationId: randomUUID() })).rejects.toMatchObject({ code: "42501" });
      await expect(persistRoofGeometry({ ...request(input(45), randomUUID(), 0), projectId: randomUUID() })).rejects.toMatchObject({ code: "42501" });

      const changes = await Promise.allSettled([
        persistRoofGeometry(request(input(35), randomUUID(), 1)),
        persistRoofGeometry(request(input(40), randomUUID(), 1)),
      ]);
      expect(changes.filter((result) => result.status === "fulfilled"), JSON.stringify(changes.map((result) => result.status === "rejected" ? { code: result.reason.code, message: result.reason.message } : { status: result.status }))).toHaveLength(1);
      expect(changes.filter((result) => result.status === "rejected").map((result) => (result as PromiseRejectedResult).reason.code)).toEqual(["40001"]);
      const retry = await persistRoofGeometry(request(input(45), operationId, 0));
      expect(retry.reused).toBe(true);
      expect(retry.roof_model_revision_id).toBe(first.roof_model_revision_id);
      const history = await admin.query("select revision_number,input_data from public.roof_model_revisions where roof_model_id=$1 order by revision_number", [roofModelId]);
      expect(history.rows).toHaveLength(2);
      expect(history.rows[0].input_data).toEqual(input(45));
      expect([35, 40]).toContain(history.rows[1].input_data.pitchDegrees);
      await expect(admin.query("update public.roof_model_revisions set input_data='{}'::jsonb where id=$1", [first.roof_model_revision_id])).rejects.toBeDefined();
    } finally { await admin.end(); }
  }, 30_000);

  it("saves and reopens a creator-scoped standalone roof", async () => {
    if (!process.env.COVERING_WRITER_DATABASE_URL?.includes("@127.0.0.1:54322/")) throw new Error("Only a configured local writer is allowed");
    const admin = new Client(adminConfig);
    await admin.connect();
    try {
      const peer = await admin.query("select user_id from public.organization_members where organization_id=$1 and user_id<>$2 limit 1", [organizationId, actorId]);
      expect(peer.rows).toHaveLength(1);
      const calculationId = randomUUID(), operationId = randomUUID();
      const geometryInput: RoofGeometryInput = { type: "pyramid", sideMm: 6000, pitchDegrees: 45 };
      const request = { organizationId, calculationId, operationId, expectedRevisionNumber: 0, name: "DEMO sátortető", input: geometryInput, output: calculateRoofGeometry(geometryInput), actorId };
      const saved = await persistStandaloneRoofGeometry(request);
      expect(saved.revision_number).toBe(1);
      const reopened = await admin.query("select c.ownership_scope,c.created_by,c.project_id,c.roof_model_id,r.input_snapshot,r.output_snapshot from public.calculations c join public.calculation_revisions r on r.id=c.current_revision_id where c.id=$1", [calculationId]);
      expect(reopened.rows[0].ownership_scope).toBe("standalone");
      expect(reopened.rows[0].created_by).toBe(actorId);
      expect(reopened.rows[0].project_id).toBeNull();
      expect(reopened.rows[0].roof_model_id).toBeNull();
      expect(reopened.rows[0].input_snapshot).toEqual(geometryInput);
      expect(reopened.rows[0].output_snapshot.totalAreaMm2).toBeCloseTo(36e6 * Math.SQRT2, 3);
      expect((await persistStandaloneRoofGeometry(request)).reused).toBe(true);
      await expect(persistStandaloneRoofGeometry({ ...request, actorId: peer.rows[0].user_id, operationId: randomUUID(), expectedRevisionNumber: 1 })).rejects.toMatchObject({ code: "42501" });
      const direct = new Client(adminConfig);
      await direct.connect();
      try {
        await direct.query("begin");
        await direct.query("set local role authenticated");
        await direct.query("select set_config('request.jwt.claim.sub',$1,true)", [peer.rows[0].user_id]);
        const hidden = await direct.query("select count(*)::integer as count from public.calculations where id=$1", [calculationId]);
        expect(hidden.rows[0].count).toBe(0);
      } finally { await direct.query("rollback"); await direct.end(); }
    } finally { await admin.end(); }
  }, 30_000);

  it("links a non-gable survey only to its exact measured roof revision", async () => {
    if (!process.env.COVERING_WRITER_DATABASE_URL?.includes("@127.0.0.1:54322/")) throw new Error("Only a configured local writer is allowed");
    const admin = new Client(adminConfig);
    await admin.connect();
    const projectId = randomUUID(), surveyId = randomUUID(), sectionId = randomUUID(), roofModelId = randomUUID();
    const geometryInput: RoofGeometryInput = { type: "hip", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35 };
    const measurements = [
      { id: randomUUID(), label: "DEMO tető külső hossza", value: 10000, unit: "mm", semanticType: "roof_outer_length" },
      { id: randomUUID(), label: "DEMO tető külső szélessége", value: 6000, unit: "mm", semanticType: "roof_outer_width" },
      { id: randomUUID(), label: "DEMO tetőhajlás", value: 35, unit: "degree", semanticType: "roof_pitch" },
    ];
    const sections = [{ id: sectionId, name: "DEMO kontytető", workType: "roof", roofType: "hip", measurements, notes: "DEMO", photoIds: [] }];
    try {
      await admin.query("insert into public.projects(id,organization_id,name,project_type,status,created_by) values($1,$2,'DEMO F9.10 felmérés','roof_renovation','draft',$3)", [projectId, organizationId, actorId]);
      await admin.query("begin");
      await admin.query("set local role authenticated");
      await admin.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId]);
      const survey = await admin.query("select * from public.save_field_survey_workspace($1::uuid,$2::uuid,$3::uuid,$4::text,$5::jsonb,$6::text,$7::integer,$8::jsonb)",
        [surveyId, organizationId, projectId, "roof", JSON.stringify(measurements), "DEMO", 0, JSON.stringify(sections)]);
      expect(survey.rows[0].version).toBe(1);
      await admin.query("commit");
      const revision = await admin.query("select id,sections from public.field_survey_revisions where survey_id=$1 and version=1", [surveyId]);
      expect(revision.rows[0].sections[0].roofType).toBe("hip");
      const saved = await persistRoofGeometry({ organizationId, projectId, roofModelId, operationId: randomUUID(), expectedRevisionNumber: 0,
        name: "DEMO kontytető", input: geometryInput, output: calculateRoofGeometry(geometryInput), actorId });
      await registerSurveyMultiRoofSource({ organizationId, surveyId, surveyRevisionId: revision.rows[0].id, sectionId,
        roofModelRevisionId: saved.roof_model_revision_id, calculationRevisionId: saved.calculation_revision_id, actorId });
      await expect(registerSurveyMultiRoofSource({ organizationId, surveyId, surveyRevisionId: revision.rows[0].id, sectionId: randomUUID(),
        roofModelRevisionId: saved.roof_model_revision_id, calculationRevisionId: saved.calculation_revision_id, actorId })).rejects.toMatchObject({ code: "22023" });
      await admin.query("begin");
      await admin.query("set local role authenticated");
      await admin.query("select set_config('request.jwt.claim.sub',$1,true)", [actorId]);
      const link = await admin.query("select public.link_field_survey_calculation($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid) as id",
        [surveyId, revision.rows[0].id, sectionId, saved.calculation_id, saved.calculation_revision_id]);
      expect(link.rows[0].id).toBeTruthy();
      await admin.query("commit");
      const reopened = await admin.query("select l.calculation_revision_id,s.roof_model_revision_id from public.field_survey_calculation_links l join public.survey_multi_roof_sources s on s.calculation_revision_id=l.calculation_revision_id where l.id=$1", [link.rows[0].id]);
      expect(reopened.rows[0]).toMatchObject({ calculation_revision_id: saved.calculation_revision_id, roof_model_revision_id: saved.roof_model_revision_id });
      const privilege = await admin.query("select has_function_privilege('authenticated','public.register_survey_multi_roof_source(uuid,uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE') as can_execute");
      expect(privilege.rows[0].can_execute).toBe(false);
    } finally { await admin.query("rollback").catch(() => undefined); await admin.end(); }
  }, 30_000);
});
