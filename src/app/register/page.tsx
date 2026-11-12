import AuthForm from "@/components/auth-form";
import { getCurrentSession } from "@/lib/current-session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthenticatedRegisterPage />
    </Suspense>
  );
}

async function AuthenticatedRegisterPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");

  return <AuthForm mode="register" />;
}
