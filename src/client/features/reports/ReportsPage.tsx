import { useState } from "react";
import { MobileHeader, LocalizedDateInput } from "../../shared/components/ui";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { type DateRangePreset, getPresetDateRange, PERIOD_OPTIONS } from "../../shared/lib/dates";
import { CategoryReport } from "./components/CategoryReport";
import { DebtReport } from "./components/DebtReport";
import { ExportPanel } from "./components/ExportPanel";
import { IncomeExpenseReport } from "./components/IncomeExpenseReport";
import { MemberReport } from "./components/MemberReport";

type TabType = "income" | "category" | "member" | "debt" | "export";

export function ReportsPage() {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("income");
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("month");
  const [activeRange, setActiveRange] = useState(() => getPresetDateRange("month"));
  const [tempCustomRange, setTempCustomRange] = useState({ from: "", to: "" });
  const [comparisonEnabled, setComparisonEnabled] = useState(false);

  const handlePresetChange = (preset: string) => {
    const typedPreset = preset as DateRangePreset;
    setRangePreset(typedPreset);
    if (typedPreset !== "custom") {
      const range = getPresetDateRange(typedPreset);
      setActiveRange(range);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempCustomRange.from && tempCustomRange.to) {
      setActiveRange(tempCustomRange);
    }
  };

  const tabs = [
    { id: "income" as const, labelKey: "incomeExpenseReport" },
    { id: "category" as const, labelKey: "categoryReports" },
    { id: "member" as const, labelKey: "memberReports" },
    { id: "debt" as const, labelKey: "debtReport" },
    { id: "export" as const, labelKey: "exportData" }
  ];

  return (
    <>
      <MobileHeader title={t("reports")} />
      <div className="flex flex-col gap-stack-md p-4 md:p-0">
        <header className="hidden md:block">
          <h1 className="text-headline-lg font-bold text-primary md:text-display-kpi-mobile">{t("reports")}</h1>
        </header>

        {/* Tab Navigation */}
        <section className="surface-card p-3">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded text-label-caps font-bold uppercase whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </section>

        {/* Period Selector */}
        <section className="surface-card p-3">
          <div className="space-y-2">
            <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("period")}</span>
                <select
                  className="field pr-10 text-sm"
                  value={rangePreset}
                  onChange={(event) => handlePresetChange(event.target.value)}
                >
                  {PERIOD_OPTIONS.map((preset) => (
                    <option key={preset} value={preset}>
                      {t(preset)}
                    </option>
                  ))}
                  <option value="custom">{t("custom")}</option>
                </select>
              </label>
              {rangePreset === "custom" && (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-[1fr_1fr_auto] md:items-end">
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("from")}</span>
                    <LocalizedDateInput
                      locale={locale}
                      value={tempCustomRange.from}
                      onChange={(val) => setTempCustomRange((current) => ({ ...current, from: val }))}
                      className="field font-data-mono tabular text-[13px] min-w-0"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("to")}</span>
                    <LocalizedDateInput
                      locale={locale}
                      value={tempCustomRange.to}
                      onChange={(val) => setTempCustomRange((current) => ({ ...current, to: val }))}
                      className="field font-data-mono tabular text-[13px] min-w-0"
                    />
                  </label>
                  <button
                    type="button"
                    className="col-span-2 sm:col-span-auto w-full sm:w-auto h-10 flex items-center justify-center rounded bg-primary px-4 text-xs font-bold uppercase text-on-primary hover:bg-primary-hover focus:outline-none"
                    onClick={handleApplyCustomRange}
                  >
                    {t("apply")}
                  </button>
                </div>
              )}
            </div>

            {/* Comparison Toggle - Only show for Income/Expense tab */}
            {activeTab === "income" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={comparisonEnabled}
                  onChange={(e) => setComparisonEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border-subtle"
                />
                <span className="text-sm">{t("enableComparison")}</span>
              </label>
            )}
          </div>
        </section>

        {/* Tab Content */}
        <section>
          {activeTab === "income" && (
            <IncomeExpenseReport
              from={activeRange.from}
              to={activeRange.to}
              comparisonEnabled={comparisonEnabled}
            />
          )}
          {activeTab === "category" && <CategoryReport from={activeRange.from} to={activeRange.to} />}
          {activeTab === "member" && <MemberReport from={activeRange.from} to={activeRange.to} />}
          {activeTab === "debt" && <DebtReport from={activeRange.from} to={activeRange.to} />}
          {activeTab === "export" && <ExportPanel from={activeRange.from} to={activeRange.to} />}
        </section>
      </div>
    </>
  );
}
