import type { NextRequest } from "next/server";
import { appEmitter, type AppEvent } from "@/lib/events";
import { verifySession } from "@/lib/dal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await verifySession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AppEvent) => {
        if (event.type !== "chat") return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {}
      };

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch {}
      }, 25_000);

      appEmitter.on("change", send);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        appEmitter.off("change", send);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
