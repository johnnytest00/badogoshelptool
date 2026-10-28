import { afterEach, describe, expect, it, vi } from "vitest";
import { optimizeUploadPhoto } from "./optimize-upload-photo";

function setupBitmap(width: number, height: number, blob: Blob) {
  const drawImage = vi.fn();
  const close = vi.fn();
  const toBlob = vi.fn((callback: BlobCallback, type?: string) => callback(new Blob([blob], { type })));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width, height, close })));
  vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({ drawImage }), toBlob, width: 0, height: 0 }) });
  return { drawImage, close, toBlob };
}

afterEach(() => vi.unstubAllGlobals());

describe("browser photo optimization", () => {
  it("keeps a small optimized photo unchanged", async () => {
    const file = new File([new Uint8Array(512_000)], "DEMO-small.jpg", { type: "image/jpeg" });
    const result = await optimizeUploadPhoto(file);
    expect(result.file).toBe(file);
    expect(result.originalBytes).toBe(file.size);
    expect(result.optimizedBytes).toBe(file.size);
  });

  it("downscales a large photo proportionally and reports actual byte savings", async () => {
    const file = new File([new Uint8Array(8_000_000)], "DEMO-phone.jpg", { type: "image/jpeg" });
    const { drawImage, close, toBlob } = setupBitmap(4000, 2000, new Blob([new Uint8Array(900_000)]));
    const result = await optimizeUploadPhoto(file);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2560, 1280);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.84);
    expect(close).toHaveBeenCalledOnce();
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.size).toBe(900_000);
    expect(result.savedPercent).toBeCloseTo(88.75);
  });

  it("preserves PNG transparency format", async () => {
    const file = new File([new Uint8Array(2_000_000)], "DEMO-transparent.png", { type: "image/png" });
    const { toBlob } = setupBitmap(1800, 1200, new Blob([new Uint8Array(1_800_000)]));
    const result = await optimizeUploadPhoto(file);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", undefined);
    expect(result.file.type).toBe("image/png");
  });

  it("does not replace a JPEG for a negligible size reduction", async () => {
    const file = new File([new Uint8Array(1_500_000)], "DEMO-already-small.jpg", { type: "image/jpeg" });
    setupBitmap(2000, 1200, new Blob([new Uint8Array(1_490_000)]));
    const result = await optimizeUploadPhoto(file);
    expect(result.file).toBe(file);
    expect(result.savedPercent).toBe(0);
  });

  it("rejects a non-supported source type", async () => {
    const file = new File(["DEMO"], "DEMO-photo.heic", { type: "image/heic" });
    await expect(optimizeUploadPhoto(file)).rejects.toThrow("JPEG, PNG vagy WebP");
  });

  it("rejects a result that still exceeds the safe request file limit", async () => {
    const file = new File([new Uint8Array(9_000_000)], "DEMO-too-large.png", { type: "image/png" });
    setupBitmap(8000, 6000, new Blob([new Uint8Array(3 * 1024 * 1024 + 1)]));
    await expect(optimizeUploadPhoto(file)).rejects.toThrow("3 MB");
  });
});
