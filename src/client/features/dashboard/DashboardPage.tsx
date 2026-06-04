import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiClient } from "../../shared/api/client";
import { EmptyState, ErrorState, LoadingState, Money, LocalizedDateInput, MobileHeader } from "../../shared/components/ui";
import { formatMoney } from "../../../shared/finance/money";
import { displayText } from "../../shared/i18n/display";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { formatDate, getPresetDateRange, PERIOD_OPTIONS } from "../../shared/lib/dates";
import type { DateRangePreset } from "../../shared/lib/dates";
import { TransactionItem } from "../../shared/components/TransactionItem";
import { useTransactionModal } from "../../shared/components/TransactionModal";
import { CategoryTransactionsModal } from "../../shared/components/CategoryTransactionsModal";
import type { CurrencyCode } from "../../../shared/types/domain";

const chartColors = ["#003441", "#006a61", "#10B981", "#F59E0B", "#E11D48", "#482700"];

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { openEdit } = useTransactionModal();
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("month");
  const [activeRange, setActiveRange] = useState(() => getPresetDateRange("month"));
  const [tempCustomRange, setTempCustomRange] = useState(() => getPresetDateRange("month"));
  const [hideValues, setHideValues] = useState(true);
  const [showParentCategories, setShowParentCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);

  const range = useMemo(() => {
    if (rangePreset === "custom") {
      return activeRange;
    }
    return getPresetDateRange(rangePreset);
  }, [activeRange, rangePreset]);

  const handlePresetChange = (preset: DateRangePreset) => {
    setRangePreset(preset);
    if (preset !== "custom") {
      const nextRange = getPresetDateRange(preset);
      setActiveRange(nextRange);
    } else {
      setTempCustomRange(range);
    }
  };

  const handleApplyCustomRange = () => {
    setActiveRange(tempCustomRange);
  };

  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const overviewQuery = useQuery({ queryKey: ["overview", range.from, range.to], queryFn: () => apiClient.overview(range.from, range.to) });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: apiClient.categories });
  const currency = (settingsQuery.data?.default_currency ?? "USD") as CurrencyCode;

  // Transform category distribution based on toggle
  const categoryDistribution = useMemo(() => {
    const overview = overviewQuery.data;
    if (!overview) return [];

    const baseData = overview.category_distribution.map((entry) => ({
      ...entry,
      name: displayText(entry.name, locale)
    }));

    if (!showParentCategories || !categoriesQuery.data) {
      return baseData;
    }

    // Create a map for quick category lookup
    const categoryMap = new Map(categoriesQuery.data.map(cat => [cat.id, cat]));

    // Group by parent category
    const parentGroups = new Map<string, { category_id: string; name: string; amount: number; color: string | null }>();

    for (const entry of overview.category_distribution) {
      const category = categoryMap.get(entry.category_id);
      const parentId = category?.parent_id;

      if (parentId) {
        // This is a child category, group under parent
        const parent = categoryMap.get(parentId);
        if (parent) {
          const existing = parentGroups.get(parentId);
          if (existing) {
            existing.amount += entry.amount;
          } else {
            parentGroups.set(parentId, {
              category_id: parentId,
              name: displayText(parent.name, locale),
              amount: entry.amount,
              color: parent.color || entry.color
            });
          }
        } else {
          // Parent not found, use as-is
          const existing = parentGroups.get(entry.category_id);
          if (existing) {
            existing.amount += entry.amount;
          } else {
            parentGroups.set(entry.category_id, {
              ...entry,
              name: displayText(entry.name, locale)
            });
          }
        }
      } else {
        // No parent, this is already a parent category
        const existing = parentGroups.get(entry.category_id);
        if (existing) {
          existing.amount += entry.amount;
        } else {
          parentGroups.set(entry.category_id, {
            ...entry,
            name: displayText(entry.name, locale)
          });
        }
      }
    }

    return Array.from(parentGroups.values());
  }, [overviewQuery.data, showParentCategories, categoriesQuery.data, locale]);

  if (overviewQuery.isLoading) {
    return <LoadingState />;
  }
  if (overviewQuery.error) {
    return <ErrorState error={overviewQuery.error} />;
  }

  const overview = overviewQuery.data;
  if (!overview) {
    return <EmptyState label={t("noData")} />;
  }

  // Calculations for mobile components
  const monthlyIncome = overview.cashflow.reduce((sum, item) => sum + item.income, 0);
  const monthlyExpense = overview.cashflow.reduce((sum, item) => sum + item.expense, 0);

  const totalSpent = categoryDistribution.reduce((sum, entry) => sum + entry.amount, 0);
  const distributionWithPct = categoryDistribution.map((entry, index) => {
    const pct = totalSpent > 0 ? Math.round((entry.amount / totalSpent) * 100) : 0;
    return {
      ...entry,
      pct,
      color: entry.color || chartColors[index % chartColors.length]
    };
  }).sort((a, b) => b.amount - a.amount);

  const totalMemberContribution = overview.member_contribution.reduce((sum, entry) => sum + entry.amount, 0);
  const memberContribWithPct = overview.member_contribution.map((entry) => {
    const pct = totalMemberContribution > 0 ? Math.round((entry.amount / totalMemberContribution) * 100) : 0;
    return {
      ...entry,
      pct
    };
  }).sort((a, b) => b.amount - a.amount);

  return (
    <>
      {/* MOBILE VIEW */}
      <div className="md:hidden flex flex-col w-full min-h-screen bg-surface-muted pb-24">
        <MobileHeader title={t("appName")} />

        {/* Mobile Main Content */}
        <main className="flex-1 flex flex-col w-full px-margin-mobile py-stack-md gap-3">
          {/* Combined KPI Section */}
          <section className="flex flex-col gap-3">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-3 flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between items-center text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  <h2 className="text-[14px] font-body-md font-medium">{t("netWorth")}</h2>
                </div>
                <button 
                  onClick={() => setHideValues(!hideValues)}
                  aria-label="Toggle visibility" 
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">{hideValues ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              <div className="text-[28px] leading-tight font-headline-lg font-bold text-primary tracking-tight">
                {hideValues ? "••••••••" : formatMoney(overview.net_worth, currency, locale)}
              </div>
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-border-subtle/50">
                <span className="text-[12px] text-on-surface-variant">{t("availableCash")}</span>
                <span className="text-[14px] font-bold text-on-surface tracking-tight">
                  {hideValues ? "••••••••" : formatMoney(overview.available_cash, currency, locale)}
                </span>
              </div>
            </div>

            {/* Monthly Income/Expense Widget */}
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-3 flex justify-between items-center shadow-sm">
              <div className="flex flex-col gap-0.5 w-1/2 border-r border-border-subtle/50 pr-3">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">{t("income")} {t("month")}</span>
                <span className="text-[15px] font-bold text-success-emerald tracking-tight">
                  +{formatMoney(monthlyIncome, currency, locale)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 w-1/2 pl-3">
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">{t("expense")} {t("month")}</span>
                <span className="text-[15px] font-bold text-danger-crisp tracking-tight">
                  -{formatMoney(monthlyExpense, currency, locale)}
                </span>
              </div>
            </div>
          </section>

          {/* Charts Grid */}
          <section className="flex flex-col gap-3">
            {/* Category Distribution */}
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-3 flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">pie_chart</span>
                  {t("categoryDistribution")}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowParentCategories(!showParentCategories)}
                  className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                    showParentCategories
                      ? 'bg-primary text-on-primary'
                      : 'hover:bg-surface-container-highest'
                  }`}
                  aria-label={showParentCategories ? "Show child categories" : "Show parent categories"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showParentCategories ? "list" : "account_tree"}
                  </span>
                </button>
              </div>
              <div className="flex flex-col gap-1.5 mt-0.5">
                {distributionWithPct.filter(entry => entry.pct > 0).map((entry) => (
                  <div
                    key={entry.category_id}
                    className="flex flex-col gap-1 cursor-pointer hover:bg-surface-container p-1 rounded transition-colors"
                    onClick={() => setSelectedCategory({ id: entry.category_id, name: entry.name })}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] truncate font-medium">{entry.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[12px] font-semibold font-data-mono">{formatMoney(entry.amount, currency, locale)}</span>
                        <span className="text-[12px] font-medium text-on-surface-variant">({entry.pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${entry.pct}%`, backgroundColor: entry.color }}></div>
                    </div>
                  </div>
                ))}
                {distributionWithPct.length === 0 && (
                  <div className="text-center text-[12px] text-on-surface-variant py-2">{t("noData")}</div>
                )}
              </div>
            </div>
          </section>

          {/* Recent Transactions */}
          <section className="flex flex-col gap-2">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="flex justify-between items-center p-3 border-b border-border-subtle">
                <h3 className="text-[13px] font-medium text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  {t("recentTransactions")}
                </h3>
                <a href="/ledger" className="text-[12px] font-bold text-secondary hover:underline">
                  {t("viewAll")}
                </a>
              </div>
              {overview.recent_transactions.length === 0 ? (
                <div className="p-4 text-center text-on-surface-variant text-[14px]">{t("noData")}</div>
              ) : (
                overview.recent_transactions.slice(0, 10).map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} showDate={true} showCategory={true} onClick={() => openEdit(transaction.id)} />
                ))
              )}
            </div>
          </section>

          {/* Member Contribution */}
          <section className="flex flex-col gap-2">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-3 flex flex-col gap-2 shadow-sm">
              <h3 className="text-[13px] font-medium text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">group</span>
                {t("memberContribution")}
              </h3>
              <div className="flex flex-col gap-2 mt-0.5">
                {memberContribWithPct.map((entry) => (
                  <div key={entry.member_id}>
                    <div className="flex justify-between items-center text-[12px] font-medium mb-1 gap-2">
                      <span className="truncate">{entry.name}</span>
                      <span className="shrink-0 text-on-surface-variant">
                        <span className="font-data-mono font-semibold text-on-surface">{formatMoney(entry.amount, currency, locale)}</span>
                        <span> ({entry.pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${entry.pct}%` }}></div>
                    </div>
                  </div>
                ))}
                {memberContribWithPct.length === 0 && (
                  <div className="text-center text-[12px] text-on-surface-variant py-2">{t("noData")}</div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:flex flex-col gap-stack-lg w-full">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-headline-lg font-bold text-primary md:text-display-kpi-mobile">{t("overview")}</h1>
          <div className="inline-flex items-center gap-2 rounded border border-border-subtle bg-surface-container-lowest px-3 py-2 text-on-surface-variant">
            <CalendarDays size={18} />
            <span className="font-data-mono tabular">{formatDate(range.from, locale)}</span>
            <ArrowRight size={14} className="text-outline-variant" />
            <span className="font-data-mono tabular">{formatDate(range.to, locale)}</span>
          </div>
        </header>

        <section className="surface-card p-3 md:hidden">
          <div className="grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
            <label className="space-y-1">
              <span className="label">{t("period")}</span>
              <select className="field pr-10" value={rangePreset} onChange={(event) => handlePresetChange(event.target.value as DateRangePreset)}>
                {PERIOD_OPTIONS.map((preset) => (
                  <option key={preset} value={preset}>{t(preset)}</option>
                ))}
                <option value="custom">{t("custom")}</option>
              </select>
            </label>
            {rangePreset === "custom" ? (
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="space-y-1">
                  <span className="label">{t("from")}</span>
                  <LocalizedDateInput
                    className="field font-data-mono tabular"
                    value={tempCustomRange.from}
                    onChange={(val) => setTempCustomRange((current) => ({ ...current, from: val }))}
                    locale={locale}
                  />
                </label>
                <label className="space-y-1">
                  <span className="label">{t("to")}</span>
                  <LocalizedDateInput
                    className="field font-data-mono tabular"
                    value={tempCustomRange.to}
                    onChange={(val) => setTempCustomRange((current) => ({ ...current, to: val }))}
                    locale={locale}
                  />
                </label>
                <button
                  type="button"
                  className="h-12 flex items-center justify-center rounded bg-primary px-4 text-label-caps font-bold uppercase text-on-primary hover:bg-primary-hover focus:outline-none"
                  onClick={handleApplyCustomRange}
                >
                  {t("apply")}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-stack-md lg:grid-cols-[2fr_1fr]">
          <article className="surface-card p-5">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between sm:block">
                  <p className="text-body-md text-on-surface-variant">{t("availableCash")}</p>
                  <div className="rounded bg-secondary-container p-2 text-on-secondary-container sm:hidden">
                    <Wallet size={20} />
                  </div>
                </div>
                <Money
                  amount={overview.available_cash}
                  currency={currency}
                  locale={locale}
                  className="mt-2 block text-display-kpi-mobile font-bold text-primary sm:text-display-kpi"
                />
              </div>
              <div className="hidden sm:block rounded bg-secondary-container p-3 text-on-secondary-container shrink-0">
                <Wallet size={28} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {overview.liquid_breakdown.map((item) => (
                <div key={item.account_id} className="rounded border border-border-subtle bg-surface-muted p-3">
                  <p className="label">{t(item.type)}</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-body-md font-semibold">{displayText(item.name, locale)}</span>
                    <Money amount={item.balance} currency={currency} locale={locale} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card p-5">
            <p className="text-body-md text-on-surface-variant">{t("netWorth")}</p>
            <Money amount={overview.net_worth} currency={currency} locale={locale} className="mt-2 block text-headline-lg font-bold text-primary" />
            <div className="mt-6 space-y-3 text-body-md">
              <div className="flex items-center justify-between gap-3 text-success-emerald">
                <span className="flex items-center gap-2"><ArrowUpRight size={18} /> {t("income")}</span>
                <Money amount={overview.cashflow.reduce((sum, item) => sum + item.income, 0)} currency={currency} locale={locale} />
              </div>
              <div className="flex items-center justify-between gap-3 text-danger-crisp">
                <span className="flex items-center gap-2"><ArrowDownRight size={18} /> {t("expense")}</span>
                <Money amount={overview.cashflow.reduce((sum, item) => sum + item.expense, 0)} currency={currency} locale={locale} />
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-stack-md lg:grid-cols-3">
          <article className="surface-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="label">{t("categoryDistribution")}</h2>
              <button
                type="button"
                onClick={() => setShowParentCategories(!showParentCategories)}
                className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                  showParentCategories
                    ? 'bg-primary text-on-primary'
                    : 'hover:bg-surface-container-highest'
                }`}
                aria-label={showParentCategories ? "Show child categories" : "Show parent categories"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showParentCategories ? "list" : "account_tree"}
                </span>
              </button>
            </div>
            {categoryDistribution.length ? (
              <>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={208}>
                    <PieChart>
                      <Pie data={categoryDistribution} dataKey="amount" nameKey="name" innerRadius={44} outerRadius={80} paddingAngle={3}>
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={entry.category_id} fill={entry.color ?? chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [<Money amount={Number(value)} currency={currency} locale={locale} />, t("amount")]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-col gap-y-1.5 border-t border-border-subtle pt-3">
                  {distributionWithPct.map((entry, index) => {
                    const pct = totalSpent > 0 ? Math.round((entry.amount / totalSpent) * 100) : 0;
                    return (
                      <div
                        key={entry.category_id}
                        className="flex items-center justify-between gap-1.5 text-[12px] text-on-surface-variant cursor-pointer hover:bg-surface-container p-1.5 -mx-1.5 rounded transition-colors"
                        onClick={() => setSelectedCategory({ id: entry.category_id, name: entry.name })}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color ?? chartColors[index % chartColors.length] }}
                          />
                          <span className="truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Money amount={entry.amount} currency={currency} locale={locale} className="font-data-mono tabular font-semibold text-on-surface" />
                          <span className="text-on-surface-variant">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState label={t("noData")} />
            )}
          </article>

          <article className="surface-card p-4">
            <h2 className="label mb-4">{t("memberContribution")}</h2>
            {overview.member_contribution.length ? (
              <>
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={memberContribWithPct} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [formatMoney(value, currency, locale), t("amount")]} />
                      <Bar dataKey="amount" fill="#006a61" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-col gap-y-1.5 border-t border-border-subtle pt-3">
                  {memberContribWithPct.map((entry) => (
                    <div key={entry.member_id} className="flex items-center justify-between gap-1.5 text-[12px] text-on-surface-variant">
                      <span className="truncate">{entry.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Money amount={entry.amount} currency={currency} locale={locale} className="font-data-mono tabular font-semibold text-on-surface" />
                        <span className="text-on-surface-variant">({entry.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState label={t("noData")} />
            )}
          </article>

          <article className="surface-card p-4">
            <h2 className="label mb-4">{t("cashflow")}</h2>
            {overview.cashflow.length ? (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={256}>
                  <AreaChart data={overview.cashflow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => formatDate(val, locale)} />
                    <YAxis hide />
                    <Tooltip formatter={(value: number, name: string) => [formatMoney(value, currency, locale), t(name)]} />
                    <Area type="monotone" dataKey="income" stroke="#10B981" fill="#10B981" fillOpacity={0.15} />
                    <Area type="monotone" dataKey="expense" stroke="#E11D48" fill="#E11D48" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState label={t("noData")} />
            )}
          </article>
        </section>

        <section className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border-subtle p-4">
            <h2 className="text-headline-md font-bold text-primary">{t("recentTransactions")}</h2>
            <a href="/ledger" className="text-label-caps font-bold uppercase text-secondary">{t("viewAll")}</a>
          </div>
          <div className="divide-y divide-border-subtle">
            {overview.recent_transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} showDate={true} showCategory={true} onClick={() => openEdit(transaction.id)} />
            ))}
          </div>
        </section>
      </div>

      {/* Category Transactions Modal */}
      <CategoryTransactionsModal
        isOpen={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
        categoryId={selectedCategory?.id ?? null}
        categoryName={selectedCategory?.name ?? ""}
        from={range.from}
        to={range.to}
        currency={currency}
      />
    </>
  );
}
