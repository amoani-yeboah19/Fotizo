import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, mediaUploadsTable, type ImageType, type MediaPurpose } from "@workspace/db";

// Images live in one public Supabase Storage bucket: anyone can read them by
// URL, only this server (with the service-role key) can write. Configuration is
// read on each call so tests and deployments can change it without a restart.
const env = {
  url: () => process.env.SUPABASE_URL?.trim().replace(/\/+$/, "") || "",
  key: () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  bucket: () => process.env.SUPABASE_STORAGE_BUCKET?.trim() || "fotizo-images",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<ImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class StorageError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const storageConfigured = () => Boolean(env.url() && env.key());

/** The file's real type from its first bytes; the client's Content-Type is not trusted. */
export function sniffImage(bytes: Buffer): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

const publicPrefix = () => `${env.url()}/storage/v1/object/public/${env.bucket()}/`;
export const publicUrl = (path: string) => `${publicPrefix()}${path}`;

/** The object path when `url` points into this deployment's bucket. */
export function pathFromUrl(url: string) {
  if (!storageConfigured() || !url.startsWith(publicPrefix())) return null;
  const path = url.slice(publicPrefix().length);
  return /^[a-z0-9/_.-]+$/i.test(path) && !path.includes("..") ? path : null;
}

const authHeaders = () => ({ Authorization: `Bearer ${env.key()}`, apikey: env.key() });

async function storageFetch(path: string, init: RequestInit) {
  try {
    return await fetch(`${env.url()}/storage/v1${path}`, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new StorageError(503, "Image storage could not be reached. Please try again.");
  }
}

// Creates the public bucket the first time it's needed; "already exists" is fine.
let bucketReady: Promise<void> | null = null;
function ensureBucket() {
  bucketReady ??= (async () => {
    const response = await storageFetch("/bucket", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        id: env.bucket(),
        name: env.bucket(),
        public: true,
        file_size_limit: MAX_IMAGE_BYTES,
        allowed_mime_types: Object.keys(EXTENSIONS),
      }),
    });
    if (response.ok) return;
    const text = await response.text();
    if (response.status === 409 || /already exists|409/i.test(text)) return;
    throw new StorageError(503, "Image storage is not set up correctly.");
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return bucketReady;
}

/** Writes bytes to the bucket at `path`. Overwrites only when asked (content-addressed copies). */
export async function putObject(path: string, bytes: Buffer, contentType: ImageType, upsert = false) {
  if (!storageConfigured()) throw new StorageError(503, "Image uploads are not available right now.");
  await ensureBucket();
  const response = await storageFetch(`/object/${env.bucket()}/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": contentType,
      "Cache-Control": "31536000",
      "x-upsert": upsert ? "true" : "false",
    },
    body: new Uint8Array(bytes),
  });
  if (!response.ok) throw new StorageError(503, "The image could not be stored. Please try again.");
  return publicUrl(path);
}

/** Validates and stores an uploaded image for its owner; returns its public URL. */
export async function storeImage(ownerId: string, purpose: MediaPurpose, bytes: Buffer) {
  if (!bytes.length) throw new StorageError(400, "Choose an image to upload.");
  if (bytes.length > MAX_IMAGE_BYTES) throw new StorageError(413, "Images must be 5 MB or smaller.");
  const contentType = sniffImage(bytes);
  if (!contentType) throw new StorageError(415, "Upload a JPEG, PNG or WebP image.");
  const path = `${purpose}/${ownerId}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const url = await putObject(path, bytes, contentType);
  await db.insert(mediaUploadsTable).values({
    ownerId,
    purpose,
    bucket: env.bucket(),
    path,
    contentType,
    bytes: bytes.length,
  });
  return { url, contentType, bytes: bytes.length };
}

/** Content-addressed path for copying existing images, so duplicates are stored once. */
export const libraryPath = (bytes: Buffer, contentType: ImageType) =>
  `library/${createHash("sha256").update(bytes).digest("hex")}.${EXTENSIONS[contentType]}`;

const LEGACY_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

/**
 * Checks a listing's images. Kept images (already on the listing) are always
 * fine. New ones must be this owner's uploads to Fotizo's bucket; while
 * storage isn't configured (local development), inline data URLs are accepted
 * as before. Returns an error message, or null when every image is acceptable.
 */
export async function listingImagesProblem(
  ownerId: string,
  purpose: MediaPurpose,
  images: string[],
  existing: string[] = [],
) {
  const fresh = images.filter((image) => !existing.includes(image));
  if (!fresh.length) return null;
  if (!storageConfigured())
    return fresh.every((image) => LEGACY_DATA_URL.test(image)) ? null : "Upload photos through Fotizo.";
  const paths = fresh.map(pathFromUrl);
  if (paths.some((p) => !p)) return "Upload photos through Fotizo.";
  const owned = await db
    .select({ path: mediaUploadsTable.path })
    .from(mediaUploadsTable)
    .where(
      and(
        eq(mediaUploadsTable.ownerId, ownerId),
        eq(mediaUploadsTable.purpose, purpose),
        eq(mediaUploadsTable.bucket, env.bucket()),
        inArray(mediaUploadsTable.path, paths as string[]),
      ),
    );
  const ownedPaths = new Set(owned.map((o) => o.path));
  return paths.every((p) => ownedPaths.has(p!)) ? null : "Use photos you uploaded to this listing.";
}

/** For tests: forget whether the bucket was created. */
export function resetStorageState() {
  bucketReady = null;
}
