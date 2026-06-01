import "dotenv/config";

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import pg from "pg";

const { Pool } = pg;

const root = process.cwd();
const publicDir = join(root, "public");
const manifestPath = join(root, "cloudinary-upload-manifest.json");

const config = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  moodFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "web-chill/moods",
  audioFolder: process.env.CLOUDINARY_AUDIO_FOLDER || "web-chill/audio",
  staticFolder: process.env.CLOUDINARY_STATIC_FOLDER || "web-chill/static",
};

const missing = Object.entries(config)
  .filter(([key, value]) => !value && !key.endsWith("Folder"))
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(`Missing Cloudinary env: ${missing.join(", ")}`);
}

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

function sign(params) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${payload}${config.apiSecret}`).digest("hex");
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "asset";
}

function mimeFromPath(path) {
  const ext = extname(path).toLowerCase();
  const types = {
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".webp": "image/webp",
  };
  return types[ext] || "application/octet-stream";
}

function resourceTypeForMime(mimeType) {
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  return "raw";
}

async function uploadBuffer({ body, mimeType, folder, publicId, resourceType }) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    folder,
    overwrite: "true",
    public_id: publicId,
    timestamp,
  };
  const formData = new FormData();
  formData.set("file", new Blob([new Uint8Array(body)], { type: mimeType }));
  formData.set("api_key", config.apiKey);
  formData.set("timestamp", timestamp);
  formData.set("folder", folder);
  formData.set("overwrite", "true");
  formData.set("public_id", publicId);
  formData.set("signature", sign(params));

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.public_id || !payload.secure_url) {
    throw new Error(payload.error?.message || `Cloudinary upload failed: ${res.status} ${res.statusText}`);
  }

  return {
    publicId: payload.public_id,
    url: payload.secure_url,
    resourceType: payload.resource_type || resourceType,
    bytes: payload.bytes,
  };
}

async function readManifest() {
  if (!existsSync(manifestPath)) return {};
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function uploadSongs(pool) {
  const { rows } = await pool.query(`
    SELECT id, src
    FROM "Song"
    WHERE "cloudinaryPublicId" IS NULL
      AND src LIKE '/audio/%'
  `);

  let count = 0;
  for (const song of rows) {
    const filePath = join(publicDir, song.src);
    if (!existsSync(filePath)) {
      console.warn(`Skip song ${song.id}: missing ${song.src}`);
      continue;
    }

    const body = await readFile(filePath);
    const asset = await uploadBuffer({
      body,
      mimeType: mimeFromPath(filePath),
      folder: config.audioFolder,
      publicId: `song-${song.id}-${slug(basename(filePath))}`,
      resourceType: "video",
    });

    await pool.query(
      `UPDATE "Song"
       SET src = $1, "cloudinaryPublicId" = $2, "cloudinaryResourceType" = $3
       WHERE id = $4`,
      [asset.url, asset.publicId, asset.resourceType, song.id]
    );
    count += 1;
    console.log(`Uploaded song ${song.id}: ${asset.url}`);
  }

  return count;
}

async function uploadMoodImages(pool) {
  const { rows } = await pool.query(`
    SELECT id, data, "mimeType"
    FROM "MoodImage"
    WHERE "publicId" IS NULL
      AND data IS NOT NULL
  `);

  let count = 0;
  for (const mood of rows) {
    const asset = await uploadBuffer({
      body: mood.data,
      mimeType: mood.mimeType,
      folder: config.moodFolder,
      publicId: `mood-${slug(mood.id)}`,
      resourceType: resourceTypeForMime(mood.mimeType),
    });

    await pool.query(
      `UPDATE "MoodImage"
       SET data = NULL, "publicId" = $1, url = $2, "resourceType" = $3, size = $4
       WHERE id = $5`,
      [asset.publicId, asset.url, asset.resourceType, asset.bytes || mood.data.length, mood.id]
    );
    count += 1;
    console.log(`Uploaded mood ${mood.id}: ${asset.url}`);
  }

  return count;
}

async function uploadStaticPublicMedia(manifest) {
  const candidates = [
    "64a26c87-38c0-4e5c-b3c6-0d47b6fb15e6.png",
    "8642963.gif",
    "moods/chill.jpg",
    "moods/f1d1e2507f1b11eaa9dcb3364a58500c.jpg",
    "moods/icegif-468.gif",
    "moods/rainy.gif",
    "moods/study.gif",
  ];

  manifest.static = manifest.static || {};
  let count = 0;

  for (const relPath of candidates) {
    if (manifest.static[relPath]?.url) continue;

    const filePath = join(publicDir, relPath);
    if (!existsSync(filePath)) continue;

    const mimeType = mimeFromPath(filePath);
    const body = await readFile(filePath);
    const asset = await uploadBuffer({
      body,
      mimeType,
      folder: config.staticFolder,
      publicId: relPath.split(/[\\/]/).map(slug).join("-"),
      resourceType: resourceTypeForMime(mimeType),
    });

    manifest.static[relPath] = asset;
    count += 1;
    console.log(`Uploaded static ${relPath}: ${asset.url}`);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return count;
}

await mkdir(join(root, "scripts"), { recursive: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const manifest = await readManifest();
  const songCount = await uploadSongs(pool);
  const moodCount = await uploadMoodImages(pool);
  const staticCount = await uploadStaticPublicMedia(manifest);

  console.log(`Done. Songs: ${songCount}, mood images: ${moodCount}, static files: ${staticCount}`);
  console.log(`Static upload manifest: ${relative(root, manifestPath)}`);
} finally {
  await pool.end();
}
