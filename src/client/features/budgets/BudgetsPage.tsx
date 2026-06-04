import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../shared/api/client";
import { ErrorState, LoadingState, Modal, MobileHeader } from "../../shared/components/ui";
import { displayText } from "../../shared/i18n/display";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { currentMonthRange } from "../../shared/lib/dates";
import { getCategoryIcon } from "../../shared/lib/categories";
import { formatMoney } from "../../../shared/finance/money";
import type { BudgetView, Category, CategoryType, CurrencyCode } from "../../../shared/types/domain";
import { RecurringBudgetsList } from "./components/RecurringBudgetsList";
import { BudgetTemplatesList } from "./components/BudgetTemplatesList";
import { RecurringBudgetForm } from "./components/RecurringBudgetForm";
import { BudgetHeader } from "./components/BudgetHeader";
import { BudgetSummaryCards } from "./components/BudgetSummaryCards";
import { BudgetGroup } from "./components/BudgetGroup";
import { BudgetList } from "./components/BudgetList";
import { BudgetForm } from "./components/BudgetForm";
import { useBudgetCalculations, usePersonalBudgetCalculations } from "./hooks/useBudgetCalculations";
import { useBudgetFilters } from "./hooks/useBudgetFilters";
import { getBudgetStatus } from "./utils/budgetHelpers";

export function BudgetsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const initialRange = currentMonthRange();
  const [selectedMonth, setSelectedMonth] = useState(`${initialRange.year}-${String(initialRange.month).padStart(2, "0")}`);
  const [editingBudget, setEditingBudget] = useState<BudgetView | "new" | null>(null);
  const [budgetType, setBudgetType] = useState<"regular" | "recurring">("regular");
  const [activeTabMobile, setActiveTabMobile] = useState<"shared" | "individual" | "recurring" | "templates">("shared");

  // Extract year and month from selectedMonth string
  const [selectedYear, selectedMonthNum] = selectedMonth.split("-").map(Number);
  const range = { month: selectedMonthNum, year: selectedYear };

  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const budgetsQuery = useQuery({ queryKey: ["budgets", range.year, range.month], queryFn: () => apiClient.budgets(range.year, range.month) });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: apiClient.categories });
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: apiClient.members });
  const meQuery = useQuery({ queryKey: ["me"], queryFn: apiClient.me });
  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteBudget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] })
  });

  const currency = (settingsQuery.data?.default_currency ?? "USD") as CurrencyCode;

  const budgets = budgetsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const currentUser = meQuery.data;

  const { memberFilter, setMemberFilter, shared, visibleIndividual } = useBudgetFilters(budgets, members);

  const {
    totalBudget,
    totalSpent,
    progress,
    daysRemaining,
    sharedBudgetTotal,
    sharedSpentTotal,
    sharedProgress,
    sharedRemaining,
    sharedRemainingPerDay,
    individualBudgetTotal,
    individualSpentTotal
  } = useBudgetCalculations(budgets, currency, locale, t, range.year, range.month);

  const { personalSpentTotal, personalBudgetTotal, personalProgress, personalRemaining } = usePersonalBudgetCalculations(
    budgets,
    currentUser?.id
  );

  if (budgetsQuery.isLoading || categoriesQuery.isLoading || membersQuery.isLoading || meQuery.isLoading) {
    return <LoadingState />;
  }
  if (budgetsQuery.error) {
    return <ErrorState error={budgetsQuery.error} />;
  }

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:flex flex-col gap-stack-lg">
        <BudgetHeader
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onAddBudget={() => setEditingBudget("new")}
        />

        <BudgetSummaryCards
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          progress={progress}
          currency={currency}
          locale={locale}
        />

        <section className="grid gap-stack-md lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-stack-md">
            <BudgetGroup
              title={t("sharedBudgets")}
              budgets={shared}
              currency={currency}
              locale={locale}
              onEdit={setEditingBudget}
              onDelete={(id) => deleteMutation.mutate(id)}
              empty={t("noData")}
            />

            <article className="surface-card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border-subtle p-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-headline-md font-bold text-primary">{t("individualBudgets")}</h2>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setMemberFilter("shared")} className={`rounded-full px-3 py-1 text-label-caps font-bold uppercase ${memberFilter === "shared" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                    {t("all")}
                  </button>
                  {members.map((member) => (
                    <button key={member.id} type="button" onClick={() => setMemberFilter(member.id)} className={`rounded-full px-3 py-1 text-label-caps font-bold uppercase ${memberFilter === member.id ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
              <BudgetList
                budgets={visibleIndividual}
                currency={currency}
                locale={locale}
                onEdit={setEditingBudget}
                onDelete={(id) => deleteMutation.mutate(id)}
                empty={t("noData")}
              />
            </article>
          </div>

          <aside className="surface-card p-4">
            <p className="text-sm text-on-surface-variant">
              {t("categoryManagementMovedToSettings")}
            </p>
          </aside>
        </section>

        <RecurringBudgetsList
          categories={categories}
          members={members}
          currency={currency}
        />
        <BudgetTemplatesList budgets={budgets} currency={currency} />
      </div>

      {/* Mobile view */}
      <div className="md:hidden flex flex-col w-full min-h-screen bg-surface-muted pb-24">
        <MobileHeader title={t("budgets")} />

        <main className="flex-1 flex flex-col w-full px-margin-mobile py-stack-md gap-4">
          {/* Mobile Sub-Header: Month Selector */}
          <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-xl border border-border-subtle shadow-sm">
            <input
              type="month"
              className="bg-transparent border-none text-headline-md font-bold text-primary p-0 focus:ring-0 cursor-pointer font-data-mono"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
            <span className="text-xs text-on-surface-variant font-medium">
              {locale === "vi" ? t("daysRemainingVi", { count: daysRemaining }) : t("daysRemaining", { count: daysRemaining })}
            </span>
          </div>

        {/* Tabs */}
        <div className="flex bg-surface-container-low rounded-xl p-1 shadow-sm border border-border-subtle">
          <button
            onClick={() => {
              setActiveTabMobile("shared");
              setMemberFilter("shared");
            }}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all ${
              activeTabMobile === "shared" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t("sharedTab")}
          </button>
          <button
            onClick={() => {
              setActiveTabMobile("individual");
              setMemberFilter("shared");
            }}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all ${
              activeTabMobile === "individual" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t("individualTab")}
          </button>
          <button
            onClick={() => setActiveTabMobile("recurring")}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all ${
              activeTabMobile === "recurring" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t("recurringTab")}
          </button>
          <button
            onClick={() => setActiveTabMobile("templates")}
            className={`flex-1 py-1.5 text-center rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all ${
              activeTabMobile === "templates" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {t("templatesTab")}
          </button>
        </div>

        {/* Summary Cards */}
        {activeTabMobile === "shared" || activeTabMobile === "individual" ? (
          <>
            {activeTabMobile === "shared" ? (
              <div className="flex flex-col gap-3">
                <div className="bg-surface-container-lowest rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-2 relative overflow-hidden">
                  <div className="flex justify-between items-center z-10">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">{t("totalSharedBudget")}</span>
                    <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
                  </div>
                  <div className="z-10 mt-1">
                    <h2 className="text-2xl font-bold text-primary leading-none">
                      {formatMoney(sharedBudgetTotal, currency, locale)}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                        <div className="bg-success-emerald h-full rounded-full" style={{ width: `${Math.min(100, sharedProgress)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-data-mono text-on-surface-variant">{sharedProgress}%</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-subtle">
                      <p className="text-xs font-medium text-on-surface-variant">
                        {t("remaining")}: {formatMoney(sharedRemaining, currency, locale)}
                      </p>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-on-surface-variant uppercase font-bold tracking-wider">{t("perDay")}</span>
                        <span className="text-xs font-data-mono text-primary font-bold">
                          {formatMoney(sharedRemainingPerDay, currency, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-lowest rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("spent")}</span>
                    <span className="text-lg font-semibold text-danger-crisp">
                      {formatMoney(sharedSpentTotal, currency, locale)}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("yourShare")}</span>
                    <span className="text-lg font-semibold text-secondary">
                      {formatMoney(personalSpentTotal, currency, locale)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-surface-container-lowest rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-2 relative overflow-hidden">
                  <div className="flex justify-between items-center z-10">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">{t("totalIndividualBudget")}</span>
                    <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
                  </div>
                  <div className="z-10 mt-1">
                    <h2 className="text-2xl font-bold text-primary leading-none">
                      {formatMoney(individualBudgetTotal, currency, locale)}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                        <div className="bg-success-emerald h-full rounded-full" style={{ width: `${Math.min(100, personalProgress)}%` }}></div>
                      </div>
                      <span className="text-[10px] font-data-mono text-on-surface-variant">{personalProgress}%</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-subtle">
                      <p className="text-xs font-medium text-on-surface-variant">
                        {t("personalRemaining")}: {formatMoney(personalRemaining, currency, locale)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-lowest rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("spent")}</span>
                    <span className="text-lg font-semibold text-danger-crisp">
                      {formatMoney(individualSpentTotal, currency, locale)}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("youSpent")}</span>
                    <span className="text-lg font-semibold text-secondary">
                      {formatMoney(personalSpentTotal, currency, locale)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Member filter chips if in Individual tab */}
            {activeTabMobile === "individual" && (
              <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 hide-scrollbar">
                <button
                  onClick={() => setMemberFilter("shared")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm border transition-colors ${
                    memberFilter === "shared"
                      ? "bg-secondary text-on-secondary border-secondary"
                      : "bg-surface-container-lowest text-on-surface-variant border-border-subtle"
                  }`}
                >
                  {t("all")}
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMemberFilter(m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm border transition-colors ${
                      memberFilter === m.id
                        ? "bg-secondary text-on-secondary border-secondary"
                        : "bg-surface-container-lowest text-on-surface-variant border-border-subtle"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}

            {/* Categories List */}
            <section className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <h3 className="text-lg font-bold text-primary">
                  {activeTabMobile === "shared" ? t("categoryList") : t("personalCategoryList")}
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {(activeTabMobile === "shared" ? shared : visibleIndividual).map((budget) => {
                  const status = getBudgetStatus(budget, currency, locale, t);
                  const budgetProgress = budget.amount > 0 ? Math.round((budget.spent / budget.amount) * 100) : 0;
                  return (
                    <div
                      key={budget.id}
                      onClick={() => setEditingBudget(budget)}
                      className="bg-surface-container-lowest p-3 rounded-xl border border-border-subtle shadow-sm flex flex-col gap-2 cursor-pointer active:bg-surface-container transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">
                            {getCategoryIcon(budget.category_icon, budget.category_type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <h4 className="text-sm font-medium text-on-surface truncate">
                              {displayText(budget.category_name, locale)}
                            </h4>
                            <span className="text-[11px] font-data-mono font-bold text-primary shrink-0 ml-2">
                              {budgetProgress}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <p className="font-data-mono text-on-surface-variant">
                              {formatMoney(budget.spent, currency, locale)} / {formatMoney(budget.amount, currency, locale)}
                            </p>
                            <p className={status.color}>{status.text}</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                        <div className={`${status.barColor} h-full rounded-full`} style={{ width: `${Math.min(100, budgetProgress)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
                {(activeTabMobile === "shared" ? shared : visibleIndividual).length === 0 && (
                  <div className="p-4 text-center text-on-surface-variant text-sm bg-surface-container-lowest rounded-xl border border-border-subtle">
                    {t("noData")}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeTabMobile === "recurring" ? (
          <RecurringBudgetsList categories={categories} members={members} currency={currency} />
        ) : (
          <BudgetTemplatesList budgets={budgets} currency={currency} />
        )}
        </main>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setEditingBudget("new")}
        className="fixed bottom-24 right-4 bg-secondary text-on-secondary rounded-full w-14 h-14 flex items-center justify-center shadow-lg md:hidden hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-transform active:scale-95 z-40"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {editingBudget ? (
        <Modal
          title={editingBudget === "new" ? t("addBudget") : t("editBudget")}
          onClose={() => {
            setEditingBudget(null);
            setBudgetType("regular");
          }}
        >
          {/* Tabs for new budget only */}
          {editingBudget === "new" && (
            <div className="mb-4 flex gap-2 border-b border-border-subtle">
              <button
                type="button"
                onClick={() => setBudgetType("regular")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  budgetType === "regular"
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t("addBudget")}
              </button>
              <button
                type="button"
                onClick={() => setBudgetType("recurring")}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${
                  budgetType === "recurring"
                    ? "border-b-2 border-primary text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {t("addRecurringBudget")}
              </button>
            </div>
          )}

          {/* Show appropriate form based on budget type */}
          {editingBudget === "new" && budgetType === "recurring" ? (
            <RecurringBudgetForm
              recurringBudget={null}
              categories={categories}
              members={members}
              currency={currency}
              onDone={() => {
                setEditingBudget(null);
                setBudgetType("regular");
                queryClient.invalidateQueries({ queryKey: ["recurring-budgets"] });
                queryClient.invalidateQueries({ queryKey: ["budgets"] });
              }}
            />
          ) : (
            <BudgetForm
              budget={editingBudget === "new" ? null : editingBudget}
              categories={categories}
              members={members}
              currency={currency}
              year={range.year}
              month={range.month}
              onDone={() => {
                setEditingBudget(null);
                setBudgetType("regular");
                queryClient.invalidateQueries({ queryKey: ["budgets"] });
              }}
              onDelete={editingBudget && editingBudget !== "new" ? () => {
                deleteMutation.mutate(editingBudget.id);
                setEditingBudget(null);
                setBudgetType("regular");
              } : undefined}
            />
          )}
        </Modal>
      ) : null}
    </>
  );
}
