import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { getAuth } from "@/lib/auth";

async function handleAuthRequest(request: NextRequest): Promise<Response> {
  try {
    const handlers = toNextJsHandler(await getAuth());
    return request.method === "GET"
      ? handlers.GET(request)
      : handlers.POST(request);
  } catch {
    return Response.json(
      { error: "Authentication service is unavailable." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
