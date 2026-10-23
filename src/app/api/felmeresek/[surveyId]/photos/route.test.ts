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
const post = (body: FormData) => new NextRequest(`http://localhost/api/felmeresek/${surveyId}/photos`, { method: "POST", body });
function oversizedMultipartRequest(contentLength?: string) {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(12 * 1024 * 1024));
    },
  });
  const headers = new Headers({ "Content-Type": "multipart/form-data; boundary=upload" });
  if (contentLength !== undefined) headers.set("Content-Length", contentLength);
  return { headers, body } as unknown as NextRequest;
}
function photoForm(bytes: Uint8Array, name = "DEMO-foto.jpg") {
  const form = new FormData();
  form.set("organizationId", organizationId);
  form.set("requestKey", "123e4567-e89b-42d3-a456-426614174005");
  form.set("expectedVersion", "2");
  const fileBytes = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  fileBytes.set(bytes);
  form.set("file", new File([fileBytes], name, { type: "image/jpeg" }));
  return form;
}
function rawPhotoMultipart(bytes: Uint8Array, extraBytes?: Uint8Array) {
  const boundary = "photo-boundary";
  const encoder = new TextEncoder();
  const prefix = encoder.encode([
    `--${boundary}\r\nContent-Disposition: form-data; name="organizationId"\r\n\r\n${organizationId}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="requestKey"\r\n\r\n123e4567-e89b-42d3-a456-426614174005\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="expectedVersion"\r\n\r\n2\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="DEMO-foto.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
  ].join(""));
  const extraHeader = extraBytes ? encoder.encode(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="extra"; filename="extra.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`) : new Uint8Array();
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.length + bytes.length + extraHeader.length + (extraBytes?.length ?? 0) + suffix.length);
  body.set(prefix); body.set(bytes, prefix.length);
  let offset = prefix.length + bytes.length;
  body.set(extraHeader, offset); offset += extraHeader.length;
  if (extraBytes) { body.set(extraBytes, offset); offset += extraBytes.length; }
  body.set(suffix, offset);
  return {
    headers: new Headers({ "Content-Type": `multipart/form-data; boundary=${boundary}` }),
    body: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(body); controller.close(); } }),
  } as unknown as NextRequest;
}

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

  it.each([undefined, "1"])(
    "rejects a streamed oversized multipart body when Content-Length is %s without reserving or uploading",
    async (contentLength) => {
      const response = await POST(oversizedMultipartRequest(contentLength), { params: Promise.resolve({ surveyId }) });
      expect(response.status).toBe(413);
      expect(state.reserve).not.toHaveBeenCalled();
      expect(state.upload).not.toHaveBeenCalled();
      expect(state.attach).not.toHaveBeenCalled();
    },
  );

  it("does not parse or write an unauthenticated photo upload", async () => {
    state.auth = null;
    const request = new NextRequest(`http://localhost/api/felmeresek/${surveyId}/photos`, {
      method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=missing" }, body: "not multipart",
    });
    expect((await POST(request, { params: Promise.resolve({ surveyId }) })).status).toBe(401);
    expect(state.reserve).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("keeps the 10 MiB per-photo limit and rejects oversized files before reservation", async () => {
    const response = await POST(rawPhotoMultipart(new Uint8Array(10 * 1024 * 1024 + 1)), { params: Promise.resolve({ surveyId }) });
    expect(response.status).toBe(413);
    expect(state.reserve).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.attach).not.toHaveBeenCalled();
  });

  it("bounds the aggregate of multiple multipart parts before any write", async () => {
    const response = await POST(rawPhotoMultipart(new Uint8Array(10 * 1024 * 1024), new Uint8Array(2 * 1024 * 1024)), { params: Promise.resolve({ surveyId }) });
    expect(response.status).toBe(413);
    expect(state.reserve).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.attach).not.toHaveBeenCalled();
  });

  it("accepts a valid photo at the 10 MiB per-photo limit", async () => {
    const jpeg = await sharp({ create: { width: 3, height: 3, channels: 3, background: "red" } }).jpeg().toBuffer();
    const bytes = new Uint8Array(10 * 1024 * 1024);
    bytes.set(jpeg);
    state.reserve.mockResolvedValue({ reused: false, version: 2 });
    state.upload.mockResolvedValue({ error: null });
    state.attach.mockResolvedValue({ version: 3 });
    const response = await POST(rawPhotoMultipart(bytes), { params: Promise.resolve({ surveyId }) });
    expect(response.status).toBe(200);
    expect(state.reserve).toHaveBeenCalledTimes(1);
    expect(state.upload).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for malformed multipart data without reservation side effects", async () => {
    const request = new NextRequest(`http://localhost/api/felmeresek/${surveyId}/photos`, {
      method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=missing" }, body: "not multipart",
    });
    expect((await POST(request, { params: Promise.resolve({ surveyId }) })).status).toBe(400);
    expect(state.reserve).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-multipart content type without reservation side effects", async () => {
    const request = new NextRequest(`http://localhost/api/felmeresek/${surveyId}/photos`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    expect((await POST(request, { params: Promise.resolve({ surveyId }) })).status).toBe(400);
    expect(state.reserve).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
  });

  it("rejects an organization outside the authenticated membership before any write", async () => {
    const form = photoForm(new Uint8Array([0xff, 0xd8, 0xff]));
    form.set("organizationId", "123e4567-e89b-42d3-a456-426614174999");
    expect((await POST(post(form), { params: Promise.resolve({ surveyId }) })).status).toBe(403);
    expect(state.reserve).not.toHaveBeenCalled();
    expect(state.upload).not.toHaveBeenCalled();
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
