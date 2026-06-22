"use client";

import { FINANCE_TABS, type FinanceTabId } from "@/lib/finance-tabs";

type FinanceTabsProps = {
  activeTab: FinanceTabId;
  onTabChange: (tab: FinanceTabId) => void;
};

export default function FinanceTabs({ activeTab, onTabChange }: FinanceTabsProps) {
  const active = FINANCE_TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-stone-200/80 bg-stone-50/95 px-6 py-4 backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex w-fit rounded-full border border-stone-200 bg-white p-0.5 shadow-sm"
          role="tablist"
          aria-label="Secciones del proyecto"
        >
          {FINANCE_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-violet-800 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {active ? (
          <p className="text-xs text-stone-500 sm:max-w-md sm:text-right">{active.description}</p>
        ) : null}
      </div>
    </div>
  );
}
