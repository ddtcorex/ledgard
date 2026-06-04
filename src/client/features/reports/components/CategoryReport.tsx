import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { apiClient } from "../../../shared/api/client";
import { Money } from "../../../shared/components/ui";
import { formatMoney } from "../../../../shared/finance/money";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { formatDate } from "../../../shared/lib/dates";
import { TransactionItem } from "../../../shared/components/TransactionItem";
import { useTransactionModal } from "../../../shared/components/TransactionModal";

interface CategoryReportProps {
  from: string;
  to: string;
}

const chartColors = ["#003441", "#006a61", "#10B981", "#F59E0B", "#E11D48", "#482700"];

export function CategoryReport({ from, to }: CategoryReportProps) {
  const { t, locale } = useI18n();
  const { openEdit } = useTransactionModal();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["category-report", from, to, selectedCategoryId],
    queryFn: () => apiClient.categoryReport(from, to, selectedCategoryId)
  });

  if (isLoading) {
    return (
      <div className="surface-card p-5">
        <p className="text-body-md text-on-surface-variant">{t("loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-card p-5">
        <p className="text-body-md text-error">{t("unableToLoadData")}</p>
      </div>
    );
  }

  // If showing drill-down (transactions for a category)
  if (selectedCategoryId && data.transactions) {
    const categoryName = data.transactions.length > 0
      ? displayText(data.transactions[0].category_name, locale)
      : "";

    const totalAmount = data.transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return (
      <div className="surface-card p-4 md:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(undefined)}
            className="text-primary hover:underline flex items-center gap-1 text-sm font-semibold"
          >
            <span className="self-center">←</span> {t("categoryReports")}
          </button>
          <span className="text-sm font-data-mono font-semibold text-on-surface">{formatMoney(totalAmount, "VND", locale)}</span>
        </div>

        {data.transactions.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm bg-surface-container-lowest rounded-xl border border-border-subtle">
            {t("noData")}
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden flex flex-col shadow-sm divide-y divide-border-subtle/50">
            {data.transactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} showDate={true} showCategory={false} onClick={() => openEdit(tx.id)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Prepare data for pie chart
  const chartData = data.categories.map((cat, index) => ({
    name: cat.name,
    value: cat.amount,
    color: chartColors[index % chartColors.length]
  }));

  const totalAmount = data.categories.reduce((sum, cat) => sum + cat.amount, 0);

  // Show category summary with pie chart and list
  return (
    <div className="space-y-4">
      {/* Desktop: Pie Chart + List side by side */}
      <div className="hidden md:block surface-card p-5">
        <h3 className="text-headline-sm font-bold mb-4">{t("categoryBreakdown")}</h3>
        <div className="grid grid-cols-[300px_1fr] gap-6">
          {/* Pie Chart */}
          <div className="flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-body-sm text-on-surface-variant">{t("noData")}</div>
            )}
          </div>

          {/* Category List */}
          <div className="flex flex-col gap-3">
            {data.categories.map((cat, index) => (
              <div
                key={cat.category_id}
                className="flex flex-col gap-1 cursor-pointer hover:bg-surface-container p-2 rounded transition-colors"
                onClick={() => setSelectedCategoryId(cat.category_id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium">{displayText(cat.name, locale)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-semibold font-data-mono">
                      {formatMoney(cat.amount, "VND", locale)}
                    </span>
                    <span className="text-body-sm text-on-surface-variant">({cat.percentage.toFixed(1)}%)</span>
                    <ChevronRight size={16} className="text-on-surface-variant" />
                  </div>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: chartColors[index % chartColors.length]
                    }}
                  ></div>
                </div>
              </div>
            ))}
            {data.categories.length === 0 && (
              <div className="text-center text-body-sm text-on-surface-variant py-4">{t("noData")}</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Pie Chart + List stacked */}
      <div className="md:hidden bg-surface-container-lowest border border-border-subtle rounded-lg p-3 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">pie_chart</span>
            {t("categoryBreakdown")}
          </h3>
        </div>

        {/* Pie Chart */}
        {chartData.length > 0 && (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category List */}
        <div className="flex flex-col gap-1.5 mt-0.5">
          {data.categories.map((cat, index) => (
            <div
              key={cat.category_id}
              className="flex flex-col gap-1 cursor-pointer active:bg-surface-container p-1 rounded transition-colors"
              onClick={() => setSelectedCategoryId(cat.category_id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] truncate font-medium">{displayText(cat.name, locale)}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[12px] font-semibold font-data-mono">
                    {formatMoney(cat.amount, "VND", locale)}
                  </span>
                  <span className="text-[12px] font-medium text-on-surface-variant">({cat.percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: chartColors[index % chartColors.length]
                  }}
                ></div>
              </div>
            </div>
          ))}
          {data.categories.length === 0 && (
            <div className="text-center text-[12px] text-on-surface-variant py-2">{t("noData")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
