import { describe, expect, it } from "vitest";
import { validateSurveyPhotoSelection } from "./photo-file";

describe("survey photo selection", () => {
  it("accepts supported phone images within the upload limit", () => {
    expect(validateSurveyPhotoSelection({ name: "DEMO eresz.jpg", type: "image/jpeg", size: 2048 })).toEqual({ ok: true });
    expect(validateSurveyPhotoSelection({ name: "DEMO eresz.png", type: "image/png", size: 10 * 1024 * 1024 })).toEqual({ ok: true });
  });

  it("gives an explicit HEIC/HEIF fallback without trusting the extension as a supported type", () => {
    expect(validateSurveyPhotoSelection({ name: "DEMO IMG_1.HEIC", type: "application/octet-stream", size: 2048 })).toMatchObject({ ok: false, error: expect.stringContaining("HEIC/HEIF") });
    expect(validateSurveyPhotoSelection({ name: "DEMO IMG_2.heif", type: "image/heif", size: 2048 })).toMatchObject({ ok: false, error: expect.stringContaining("JPEG") });
    expect(validateSurveyPhotoSelection({ name: "DEMO hibás.jpg", type: "application/octet-stream", size: 2048 })).toMatchObject({ ok: false });
  });

  it("rejects empty and oversized images before sending them", () => {
    expect(validateSurveyPhotoSelection({ name: "DEMO üres.webp", type: "image/webp", size: 0 })).toMatchObject({ ok: false });
    expect(validateSurveyPhotoSelection({ name: "DEMO nagy.webp", type: "image/webp", size: 10 * 1024 * 1024 + 1 })).toMatchObject({ ok: false });
  });
});
