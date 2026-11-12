import "server-only";

import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth/minimal";
import { getAppOrigin } from "@/lib/app-origin";
import { getMongoDatabase } from "@/lib/mongodb";

type BetterAuthInstance = Awaited<ReturnType<typeof createAuth>>;
type AuthCache = {
  instancePromise: Promise<BetterAuthInstance> | null;
};

const globalForAuth = globalThis as typeof globalThis & {
  betterAuthCache?: AuthCache;
};

const cache =
  globalForAuth.betterAuthCache ??
  (globalForAuth.betterAuthCache = { instancePromise: null });

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

async function createAuth() {
  const secret = getAuthSecret();
  const baseURL = getAppOrigin();

  const { client, db } = await getMongoDatabase();

  return betterAuth({
    appName: "Minto",
    baseURL,
    secret,
    database: mongodbAdapter(db, { client }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    rateLimit: {
      enabled: true,
      customRules: {
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    logger: {
      level: "warn",
      log(level) {
        if (level === "error") {
          console.error("[Better Auth] An authentication error occurred.");
        } else {
          console.warn("[Better Auth] An authentication warning occurred.");
        }
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
  });
}

export async function getAuth(): Promise<BetterAuthInstance> {
  if (!cache.instancePromise) {
    cache.instancePromise = createAuth();
  }

  try {
    return await cache.instancePromise;
  } catch (error) {
    cache.instancePromise = null;
    throw error;
  }
}
