CREATE TABLE "MoodImage" (
  "id"        TEXT NOT NULL,
  "data"      BYTEA NOT NULL,
  "mimeType"  TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoodImage_pkey" PRIMARY KEY ("id")
);
