ALTER TABLE "Song"
  ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "cloudinaryResourceType" TEXT;
