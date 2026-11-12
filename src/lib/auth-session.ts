import "server-only";

import { isObjectIdOrHexString, Types } from "mongoose";
import { getAuth } from "@/lib/auth";

export async function getAuthenticatedOwnerId(
  request: Request,
): Promise<Types.ObjectId | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user.id;

  if (typeof userId !== "string" || !isObjectIdOrHexString(userId)) {
    return null;
  }

  try {
    return new Types.ObjectId(userId);
  } catch {
    return null;
  }
}
