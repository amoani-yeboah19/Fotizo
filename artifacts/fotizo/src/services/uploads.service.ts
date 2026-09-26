import { api, AUTH_USE_MOCKS } from "@/api";

export type UploadPurpose = "product" | "service";

/**
 * Stores an image in Fotizo's storage (Supabase) and returns its public URL.
 * Demo builds have no server, so they keep the image inline as a data URL.
 */
export async function uploadImage(image: Blob, purpose: UploadPurpose): Promise<string> {
  if (AUTH_USE_MOCKS)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(image);
    });
  const { url } = await api.post<{ url: string }>(`/uploads/images?purpose=${purpose}`, image);
  return url;
}
