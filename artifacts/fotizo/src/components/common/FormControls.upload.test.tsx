// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AvatarUploadInput } from "./FormControls";
import { uploadImage } from "@/services/uploads.service";
import { ApiError } from "@/api";
vi.mock("@/services/uploads.service", () => ({ uploadImage: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function photoDecoder(success = true) {
  vi.stubGlobal("Image", class {
    width = 800; height = 800; onload?: () => void; onerror?: () => void;
    set src(_value: string) { queueMicrotask(() => success ? this.onload?.() : this.onerror?.()); }
  });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:photo"), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as never);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(cb => cb(new Blob(["jpeg"], { type: "image/jpeg" })));
}
it("uploads a decoded phone photo even when the file picker omits its MIME type", async () => {
  photoDecoder(); vi.mocked(uploadImage).mockResolvedValue("https://images.example/photo.jpg");
  const onChange = vi.fn(); const busy = vi.fn();
  const { container } = render(<AvatarUploadInput value="" onChange={onChange} onBusyChange={busy} />);
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["photo"], "camera.jpg")] } });
  await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://images.example/photo.jpg"));
  expect(uploadImage).toHaveBeenCalledWith(expect.any(Blob), "service");
  expect(busy.mock.calls).toEqual([[true], [false]]);
});
it("explains unsupported phone formats without submitting a broken image", async () => {
  photoDecoder(false); vi.mocked(uploadImage).mockClear();
  const { container } = render(<AvatarUploadInput value="" onChange={vi.fn()} />);
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["heic"], "camera.heic", { type: "image/heic" })] } });
  expect((await screen.findByRole("alert")).textContent).toContain("export your iPhone photo as JPEG");
  expect(uploadImage).not.toHaveBeenCalled();
});
it("distinguishes a storage failure and keeps the existing photo", async () => {
  photoDecoder(); vi.mocked(uploadImage).mockRejectedValue(new ApiError(503, "Unavailable", null, "/uploads/images"));
  const onChange = vi.fn();
  const { container } = render(<AvatarUploadInput value="https://images.example/old.jpg" onChange={onChange} />);
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["photo"], "camera.jpg", { type: "image/jpeg" })] } });
  expect((await screen.findByRole("alert")).textContent).toContain("Photo storage is temporarily unavailable");
  expect(onChange).not.toHaveBeenCalled();
});
