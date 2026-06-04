import { FormEvent, useState } from "react";
import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { ErrorState } from "../../../shared/components/ui";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { useCreateBudgetTemplate } from "../hooks/useBudgets";

export function BudgetTemplateForm({
  budgets,
  currency,
  onDone
}: {
  budgets: BudgetView[];
  currency: CurrencyCode;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(false);

  const createMutation = useCreateBudgetTemplate();

  function submit(event: FormEvent) {
    event.preventDefault();

    if (budgets.length === 0) return;

    const items = budgets.map((b) => ({
      category_id: b.category_id,
      member_id: b.member_id,
      amount: b.amount,
      currency: b.currency
    }));

    createMutation.mutate(
      {
        name,
        description: description || null,
        is_shared: isShared ? 1 : 0,
        created_by: "",
        items
      },
      { onSuccess: onDone }
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {createMutation.error && <ErrorState error={createMutation.error} />}

      {budgets.length === 0 ? (
        <div className="rounded bg-danger-crisp/10 p-3 text-sm text-danger-crisp">
          {t("noData")}
        </div>
      ) : (
        <div className="rounded bg-primary-container/30 p-3 text-sm text-primary">
          {t("templateAppliedSuccess", { count: budgets.length })}
        </div>
      )}

      <label className="space-y-1">
        <span className="label">{t("templateName")}</span>
        <input
          className="field"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={budgets.length === 0}
          required
        />
      </label>

      <label className="space-y-1">
        <span className="label">{t("templateDescription")}</span>
        <textarea
          className="field resize-none"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={budgets.length === 0}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="accent-primary"
          checked={isShared}
          onChange={(e) => setIsShared(e.target.checked)}
          disabled={budgets.length === 0}
        />
        <span className="text-sm">{t("shareTemplate")}</span>
      </label>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onDone}
          className="min-h-12 rounded bg-surface-container-high px-5 py-3 text-label-caps font-bold uppercase text-on-surface"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary"
          disabled={createMutation.isPending || !name.trim() || budgets.length === 0}
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}