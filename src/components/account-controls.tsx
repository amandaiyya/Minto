"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AccountControlsProps = {
  onAuthenticated: () => void;
};

export default function AccountControls({ onAuthenticated }: AccountControlsProps) {
  const router = useRouter();
  const { data: session, isPending, error: sessionError } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signOutInFlight = useRef(false);
  const loginRedirectStarted = useRef(false);
  const user = session?.user;
  const identity = user?.name?.trim() || user?.email || (isPending ? "Loading account" : "Account");

  const redirectToLogin = useCallback(() => {
    if (loginRedirectStarted.current) return;
    loginRedirectStarted.current = true;
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (isPending || sessionError) return;

    if (session) {
      loginRedirectStarted.current = false;
      onAuthenticated();
      return;
    }

    if (session === null) redirectToLogin();
  }, [isPending, session, sessionError, onAuthenticated, redirectToLogin]);

  async function handleSignOut() {
    if (signOutInFlight.current) return;
    signOutInFlight.current = true;
    setSigningOut(true);
    setError(null);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("We couldn’t sign you out. Please try again.");
        return;
      }

      redirectToLogin();
      router.refresh();
    } catch {
      setError("We couldn’t sign you out. Please try again.");
    } finally {
      signOutInFlight.current = false;
      setSigningOut(false);
    }
  }

  return (
    <div className="account-controls" aria-busy={signingOut}>
      <div className="account-identity" title={identity}>
        <span className="account-initial" aria-hidden="true">
          {identity.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <button
        className="button button-secondary account-signout"
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
      {error && <p className="account-error" role="alert">{error}</p>}
    </div>
  );
}
