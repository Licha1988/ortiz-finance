import FinanceApp from "@/components/FinanceApp";
import { isAuthConfigured } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isAuthConfigured()) {
    return <FinanceApp />;
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return <FinanceApp username={session.username} />;
}
