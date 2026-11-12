import ExpenseDashboard from "@/components/expense-dashboard";
import { getCurrentSession } from "@/lib/current-session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return <ExpenseDashboard />;
}
