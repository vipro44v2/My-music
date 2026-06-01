import "server-only";

import { createHash, randomUUID } from "node:crypto";

type CloudinaryResourceType = "image" | "video";

type CloudinaryUploadResponse = {
  public_id: string;
  secure_url: string;
  resource_type: CloudinaryResourceType;
  bytes?: number;
};

type UploadBufferOptions = {
  body: Buffer;
  mimeType: string;
  folder: string;
  publicId: string;
  resourceType?: CloudinaryResourceType;
};

function getCloudinaryConfig() {
  const config = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "web-chill/moods",
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "folder" && !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary config: ${missing.join(", ")}`);
  }

  return config;
}

function sign(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function resourceTypeForMime(mimeType: string): CloudinaryResourceType {
  return mimeType.startsWith("video/") ? "video" : "image";
}

export async function uploadCloudinaryBuffer({
  body,
  mimeType,
  folder,
  publicId,
  resourceType = resourceTypeForMime(mimeType),
}: UploadBufferOptions) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const formData = new FormData();
  formData.set("file", new Blob([new Uint8Array(body)], { type: mimeType || "application/octet-stream" }));
  formData.set("api_key", config.apiKey);
  formData.set("timestamp", timestamp);
  formData.set("folder", folder);
  formData.set("public_id", publicId);
  formData.set("signature", sign(params, config.apiSecret));

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );
  const payload = (await res.json().catch(() => ({}))) as Partial<CloudinaryUploadResponse> & {
    error?: { message?: string };
  };

  if (!res.ok || !payload.public_id || !payload.secure_url || !payload.resource_type) {
    throw new Error(payload.error?.message || `Cloudinary upload failed: ${res.status} ${res.statusText}`);
  }

  return {
    publicId: payload.public_id,
    url: payload.secure_url,
    resourceType: payload.resource_type,
    bytes: payload.bytes,
  };
}

export async function uploadMoodAsset(moodId: string, file: File, body: Buffer) {
  const config = getCloudinaryConfig();

  return uploadCloudinaryBuffer({
    body,
    mimeType: file.type || "image/jpeg",
    folder: config.folder,
    publicId: `${moodId}-${randomUUID()}`,
  });
}

export async function uploadSongAsset(songId: number | string, file: File, body: Buffer) {
  return uploadCloudinaryBuffer({
    body,
    mimeType: file.type || "audio/mpeg",
    folder: process.env.CLOUDINARY_AUDIO_FOLDER || "web-chill/audio",
    publicId: `${songId}-${randomUUID()}`,
    resourceType: "video",
  });
}

export async function deleteMoodAsset(publicId: string, resourceType: string | null | undefined) {
  const config = getCloudinaryConfig();
  const safeResourceType = resourceType === "video" ? "video" : "image";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { public_id: publicId, timestamp };

  const formData = new FormData();
  formData.set("api_key", config.apiKey);
  formData.set("timestamp", timestamp);
  formData.set("public_id", publicId);
  formData.set("signature", sign(params, config.apiSecret));

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${safeResourceType}/destroy`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(payload.error?.message || `Cloudinary delete failed: ${res.status} ${res.statusText}`);
  }
}
