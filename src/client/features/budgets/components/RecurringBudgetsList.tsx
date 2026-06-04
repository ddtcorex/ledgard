import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Category, CurrencyCode, Member, RecurringBudget } from "../../../../shared/types/domain";
import { formatMoney, toMajorUnits } from "../../../../shared/finance/money";
import { apiClient } from "../../../shared/api/client";
import { ErrorState, LoadingState, Modal } from "../../../shared/components/ui";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { useRecurringBudgets, useDeleteRecurringBudget } from "../hooks/useBudgets";
import { RecurringBudgetForm } from "./RecurringBudgetForm";

export function RecurringBudgetsList({
  categories,
  members,
  currency
}: {
  categories: Category[];
  members: Member[];
  currency: CurrencyCode;
}) {
  const { t, locale } = useI18n();
  const [editingBudget, setEditingBudget] = useState<RecurringBudget | "new" | null>(null);

  const recurringQuery = useRecurringBudgets();
  const deleteMutation = useDeleteRecurringBudget();

  if (recurringQuery.isLoading) {
    return <LoadingState />;
  }

  if (recurringQuery.error) {
    return <ErrorState error={recurringQuery.error} />;
  }

  const recurringBudgets = recurringQuery.data ?? [];

  return (
    <>
      <section className="surface-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle p-4">
          <h2 className="text-headline-md font-bold text-primary">{t("recurringBudgets")}</h2>
          <button
            type="button"
            onClick={() => setEditingBudget("new")}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-label-caps font-bold uppercase text-on-primary"
          >
            {t("addRecurringBudget")}
          </button>
        </div>

        {recurringBudgets.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">{t("noRecurringBudgets")}</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {recurringBudgets.map((budget) => (
              <div key={budget.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-on-surface">
                        {displayText(budget.category_name ?? "", locale)}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          budget.is_active
                            ? "bg-success-emerald/10 text-success-emerald"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {budget.is_active ? t("recurringBudgetActive") : t("recurringBudgetInactive")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {budget.member_name ?? t("shared")} • {t(budget.frequency)}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="font-data-mono text-primary">
                        {formatMoney(budget.amount, budget.currency, locale)}
                      </span>
                      <span className="text-on-surface-variant">
                        {t("nextRun")}: {String(budget.next_run_month).padStart(2, "0")}/
                        {budget.next_run_year}
                      </span>
                      {budget.end_month && budget.end_year && (
                        <span className="text-on-surface-variant">
                          {t("endDate")}: {String(budget.end_month).padStart(2, "0")}/{budget.end_year}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="action-group">
                    <button
                      type="button"
                      className="action-group-btn"
                      onClick={() => setEditingBudget(budget)}
                      aria-label={t("editRecurringBudget")}
                    >
                      <Edit2 size={14} />
                    </button>
                    <div className="action-group-divider" />
                    <button
                      type="button"
                      className="action-group-btn danger"
                      onClick={() => {
                        if (confirm(t("confirmDeleteRecurringBudget"))) {
                          deleteMutation.mutate(budget.id);
                        }
                      }}
                      aria-label={t("deleteRecurringBudget")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editingBudget && (
        <Modal
          title={editingBudget === "new" ? t("addRecurringBudget") : t("editRecurringBudget")}
          onClose={() => setEditingBudget(null)}
        >
          <RecurringBudgetForm
            recurringBudget={editingBudget === "new" ? null : editingBudget}
            categories={categories}
            members={members}
            currency={currency}
            onDone={() => setEditingBudget(null)}
          />
        </Modal>
      )}
    </>
  );
}
