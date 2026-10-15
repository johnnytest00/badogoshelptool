import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

const state = vi.hoisted(() => ({
  auth: { userId: "user-1", organizations: [{ id: "123e4567-e89b-42d3-a456-426614174000" }] } as { userId: string; organizations: { id: string }[] } | null,
  signed: vi.fn(async (key: string) => ({ data: { signedUrl: `https://private.invalid/${key}` }, error: null })),
  upload: vi.fn(), reserve: vi.fn(), attach: vi.fn(),
}));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/infrastructure/supabase/field-survey-photo-writer", () => ({
  attachFieldSurveyPhoto: state.attach, cancelFieldSurveyPhotoUpload: vi.fn(), removeFieldSurveyPhoto: vi.fn(), reserveFieldSurveyPhoto: state.reserve,
}));
vi.mock("@/features/field-surveys/field-survey-data", () => ({
  getFieldSurvey: async () => ({ id: "123e4567-e89b-42d3-a456-426614174002", version: 2 }),
  getFieldSurveyRevision: async (_org: string, _survey: string, version: number) => ({
    photosSnapshot: [{ id: version === 1 ? "photo-a" : "photo-b", objectKey: version === 1 ? "a.jpg" : "b.jpg" }],
  }),
}));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({
  from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: [
    { id: "photo-a", object_key: "a.jpg", display_filename: "DEMO A.jpg", mime_type: "image/jpeg", file_size: 100, description: null, uploaded_at: "" },
    { id: "photo-b", object_key: "b.jpg", display_filename: "DEMO B.jpg", mime_type: "image/jpeg", file_size: 100, description: null, uploaded_at: "" },
  ], error: null }) }) }) }),
  storage: { from: () => ({ createSignedUrl: state.signed, upload: state.upload }) },
}) }));

import { GET, POST } from "./route";

const surveyId = "123e4567-e89b-42d3-a456-426614174002";
const organizationId = "123e4567-e89b-42d3-a456-426614174000";
const get = (version: number) => GET(new NextRequest(`http://localhost/api/felmeresek/${surveyId}/photos?organization=${organizationId}&version=${version}`), { params: Promise.resolve({ surveyId }) });

describe("field survey revision photos", () => {
  beforeEach(() => { state.auth = { userId: "user-1", organizations: [{ id: organizationId }] }; state.signed.mockClear(); state.upload.mockReset(); state.reserve.mockReset(); state.attach.mockReset(); });

  it("signs only the selected revision's photo and never mixes V1/V2", async () => {
    const v1 = await (await get(1)).json();
    const v2 = await (await get(2)).json();
    expect(v1.photos.map((photo: { id: string }) => photo.id)).toEqual(["photo-a"]);
    expect(v2.photos.map((photo: { id: string }) => photo.id)).toEqual(["photo-b"]);
    expect(state.signed).toHaveBeenCalledTimes(2);
  });

  it("does not sign a photo for unauthenticated or foreign organization requests", async () => {
    state.auth = null;
    expect((await get(1)).status).toBe(401);
    state.auth = { userId: "user-2", organizations: [{ id: "123e4567-e89b-42d3-a456-426614174999" }] };
    expect((await get(1)).status).toBe(403);
    expect(state.signed).not.toHaveBeenCalled();
  });

  it("allows a failed private upload to retry with the same request key", async () => {
    const bytes = await sharp({ create: { width: 3, height: 3, channels: 3, background: "red" } }).jpeg().toBuffer();
    const requestKey = "123e4567-e89b-42d3-a456-426614174005";
    const request = () => {
      const form = new FormData();
      form.set("organizationId", organizationId); form.set("requestKey", requestKey); form.set("expectedVersion", "2");
      form.set("file", new File([bytes], "DEMO-foto.jpg", { type: "image/jpeg" }));
      return new NextRequest(`http://localhost/api/felmeresek/${surveyId}/photos`, { method: "POST", body: form });
    };
    state.reserve.mockResolvedValue({ reused: false, version: 2 });
    state.upload.mockResolvedValueOnce({ error: { status: 502, statusCode: "storage_error" } }).mockResolvedValueOnce({ error: null });
    state.attach.mockResolvedValue({ version: 3 });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      expect((await POST(request(), { params: Promise.resolve({ surveyId }) })).status).toBe(502);
      const retry = await POST(request(), { params: Promise.resolve({ surveyId }) });
      expect(retry.status).toBe(200);
      expect((await retry.json()).version).toBe(3);
      expect(state.reserve).toHaveBeenCalledTimes(2);
      expect(state.reserve.mock.calls[0][0].requestKey).toBe(requestKey);
      expect(state.reserve.mock.calls[1][0].requestKey).toBe(requestKey);
      expect(state.attach).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
  });
});
