"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AppHeader from "@/components/AppHeader";
import CashflowExcelView from "@/components/CashflowExcelView";
import FinanceTabs from "@/components/FinanceTabs";
import InvestmentTab from "@/components/InvestmentTab";
import PipelineSection from "@/components/PipelineSection";
import PageLayout from "@/components/ui/PageLayout";
import { type FinanceTabId } from "@/lib/finance-tabs";

type FinanceAppProps = {
  username?: string;
};

export default function FinanceApp({ username }: FinanceAppProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<FinanceTabId>("investment");

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  return (
    <div className="min-h-full">
      <AppHeader
        username={username}
        onLogout={username ? handleLogout : undefined}
        loggingOut={loggingOut}
      />
      <PageLayout className="pb-12">
        <FinanceTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="mt-6">
          {activeTab === "eerr" ? <CashflowExcelView /> : null}
          {activeTab === "pipeline" ? <PipelineSection /> : null}
          {activeTab === "investment" ? <InvestmentTab /> : null}
        </div>
      </PageLayout>
    </div>
  );
}
