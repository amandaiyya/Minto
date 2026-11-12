import AuthForm from "@/components/auth-form";
import { getCurrentSession } from "@/lib/current-session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthenticatedLoginPage />
    </Suspense>
  );
}

async function AuthenticatedLoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return <AuthForm mode="login" />;
}
