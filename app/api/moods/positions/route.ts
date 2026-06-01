import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { emitChange } from "@/lib/events";

export const dynamic = "force-dynamic";

const SETTING_KEY = "mood_image_positions";

export interface MoodImagePosition {
  desktop: string;
  mobile: string;
}

const NAMED_POSITIONS = new Set([
  "center center",
  "center top",
  "center bottom",
  "left center",
  "right center",
]);

function sanitizePosition(value: string | null | undefined) {
  if (!value) return "center center";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (NAMED_POSITIONS.has(trimmed)) return trimmed;
  if (/^(100|[1-9]?\d(?:\.\d+)?)% (100|[1-9]?\d(?:\.\d+)?)%$/.test(trimmed)) {
    return trimmed;
  }
  return "center center";
}

function parsePositions(value: string | null | undefined): Record<string, MoodImagePosition> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, Partial<MoodImagePosition>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, pos]) => [
        id,
        {
          desktop: sanitizePosition(pos.desktop),
          mobile: sanitizePosition(pos.mobile),
        },
      ])
    );
  } catch {
    return {};
  }
}

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  return Response.json(parsePositions(setting?.value));
}

export async function PUT(req: Request) {
  if (!(await verifyAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json() as {
    id?: string;
    desktop?: string;
    mobile?: string;
  };

  if (!body.id) {
    return Response.json({ error: "Mood id is required" }, { status: 400 });
  }

  const desktop = sanitizePosition(body.desktop);
  const mobile = sanitizePosition(body.mobile);

  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  const current = parsePositions(setting?.value);
  const next = { ...current, [body.id]: { desktop, mobile } };

  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) },
  });

  emitChange({ type: "moods" });
  return Response.json(next[body.id]);
}
