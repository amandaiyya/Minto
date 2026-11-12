import "server-only";
import { getAppOrigin } from "@/lib/app-origin";

function getRequestOrigin(request: Request): string | null {
  if (request.headers.has("origin")) {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null") return null;

    try {
      const url = new URL(origin);
      if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      ) {
        return null;
      }

      return url.origin;
    } catch {
      return null;
    }
  }

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    const url = new URL(referer);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function validateExpenseMutationOrigin(request: Request): Response | null {
  let expectedOrigin: string;
  try {
    expectedOrigin = getAppOrigin();
  } catch {
    expectedOrigin = "";
  }
  const requestOrigin = getRequestOrigin(request);

  if (!expectedOrigin || !requestOrigin || requestOrigin !== expectedOrigin) {
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Request origin is not allowed.",
        },
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return null;
}
