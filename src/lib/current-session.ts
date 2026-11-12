import "server-only";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export async function getCurrentSession() {
  const requestHeaders = await headers();
  const auth = await getAuth();
  return auth.api.getSession({ headers: requestHeaders });
}
