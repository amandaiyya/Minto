import "server-only";

const DEVELOPMENT_ORIGIN = "http://localhost:3000";

/** Resolve the canonical application origin without trusting request headers. */
export function getAppOrigin(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const configuredUrl = process.env.BETTER_AUTH_URL;

  if (configuredUrl === undefined) {
    if (isProduction) {
      throw new Error("Application origin configuration is required in production.");
    }

    return DEVELOPMENT_ORIGIN;
  }

  if (!configuredUrl || configuredUrl !== configuredUrl.trim()) {
    throw new Error("Application origin configuration is invalid.");
  }

  try {
    const url = new URL(configuredUrl);
    const authority = configuredUrl
      .slice(configuredUrl.indexOf("://") + 3)
      .split(/[/?#]/, 1)[0];
    const allowedProtocol = isProduction
      ? url.protocol === "https:"
      : url.protocol === "http:" || url.protocol === "https:";

    if (
      !allowedProtocol ||
      authority.includes("@") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      configuredUrl.includes("?") ||
      configuredUrl.includes("#") ||
      configuredUrl.includes("\\") ||
      url.search ||
      url.hash
    ) {
      throw new Error("Invalid application origin.");
    }

    return url.origin;
  } catch {
    throw new Error("Application origin configuration is invalid.");
  }
}
