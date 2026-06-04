import { useMutation } from "@tanstack/react-query";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { BudgetView, Category, CurrencyCode, Member } from "../../../../shared/types/domain";
import { fromMajorUnits, toMajorUnits } from "../../../../shared/finance/money";
import { zeroDecimalCurrencies } from "../../../../shared/constants/currencies";
import { apiClient } from "../../../shared/api/client";
import { ErrorState } from "../../../shared/components/ui";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { useConfirm } from "../../../app/providers";

export function BudgetForm({
  budget,
  categories,
  members,
  currency,
  year,
  month,
  onDone,
  onDelete
}: {
  budget: BudgetView | null;
  categories: Category[];
  members: Member[];
  currency: CurrencyCode;
  year: number;
  month: number;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const { t, locale } = useI18n();
  const { confirm } = useConfirm();

  // Separate parent and child categories
  const expenseCategories = categories.filter((category) => category.type === "expense" && (category.is_active || category.id === budget?.category_id));
  const parentCategories = expenseCategories.filter((cat) => !cat.parent_id);
  const childCategories = expenseCategories.filter((cat) => cat.parent_id);

  // Convert year/month to month string (YYYY-MM format for budget period)
  const initialMonth = budget
    ? `${budget.period_year}-${String(budget.period_month).padStart(2, "0")}`
    : `${year}-${String(month).padStart(2, "0")}`;

  const [localAmount, setLocalAmount] = useState<string>(budget ? String(toMajorUnits(budget.amount, budget.currency)) : "");
  const [form, setForm] = useState({
    category_id: budget?.category_id ?? childCategories[0]?.id ?? "",
    member_id: budget?.member_id ?? "",
    amount: budget ? String(toMajorUnits(budget.amount, budget.currency)) : "",
    period_month: initialMonth
  });

  // Sync localAmount with form.amount (for editing)
  useEffect(() => {
    if (budget && form.amount) {
      setLocalAmount(form.amount);
    }
  }, [budget, form.amount]);

  const mutation = useMutation({
    mutationFn: () => {
      // Extract year and month from period_month (YYYY-MM format)
      const [periodYear, periodMonth] = form.period_month.split("-").map(Number);

      const payload = {
        category_id: form.category_id,
        member_id: form.member_id || null,
        amount: fromMajorUnits(Number(form.amount), currency),
        currency,
        period_year: periodYear,
        period_month: periodMonth
      };
      return budget ? apiClient.updateBudget(budget.id, payload) : apiClient.createBudget(payload);
    },
    onSuccess: onDone
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // Locale-aware amount formatting
  const intlLocale = locale === "vi" ? "vi-VN" : "en-US";
  const isZeroDecimal = zeroDecimalCurrencies.has(currency);

  const displayAmount = useMemo(() => {
    if (!localAmount) return "";
    const num = Number(localAmount);
    if (isNaN(num)) return localAmount;
    return new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
      minimumFractionDigits: 0,
      useGrouping: true
    }).format(num);
  }, [localAmount, intlLocale, isZeroDecimal]);

  function handleAmountInput(raw: string) {
    if (isZeroDecimal) {
      // VND, JPY: only digits allowed
      const cleaned = raw.replace(/[^\d]/g, "");
      setLocalAmount(cleaned);
      update("amount", cleaned);
    } else {
      // USD, EUR: strip grouping separators, replace decimal sep with .
      const groupSep = locale === "vi" ? "." : ",";
      const decimalSep = locale === "vi" ? "," : ".";
      let cleaned = raw.replaceAll(groupSep, "");
      cleaned = cleaned.replace(decimalSep, ".");
      // Remove anything that's not a digit or decimal point
      cleaned = cleaned.replace(/[^\d.]/g, "");
      // Prevent multiple decimal points
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts[0] + "." + parts.slice(1).join("");
      }
      setLocalAmount(cleaned);
      update("amount", cleaned);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
      {mutation.error ? <div className="md:col-span-2"><ErrorState error={mutation.error} /></div> : null}
      <label className="space-y-1">
        <span className="label">{t("category")}</span>
        <select className="field" value={form.category_id} onChange={(event) => update("category_id", event.target.value)} required>
          {parentCategories.map((parent) => {
            const children = childCategories.filter((child) => child.parent_id === parent.id);
            if (children.length === 0) return null;
            return (
              <optgroup key={parent.id} label={displayText(parent.name, locale)}>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {displayText(child.name, locale)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("member")}</span>
        <select className="field" value={form.member_id} onChange={(event) => update("member_id", event.target.value)}>
          <option value="">{t("shared")}</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("amount")}</span>
        <input
          className="field font-data-mono tabular"
          type="text"
          inputMode="decimal"
          value={displayAmount}
          onChange={(event) => handleAmountInput(event.target.value)}
          required
        />
      </label>
      <label className="space-y-1">
        <span className="label">{t("date")}</span>
        <input
          type="month"
          className="field font-data-mono tabular"
          value={form.period_month}
          onChange={(event) => update("period_month", event.target.value)}
          required
        />
      </label>
      <div className="flex justify-between gap-3 md:col-span-2">
        {budget && onDelete ? (
          <button
            type="button"
            onClick={async () => {
              const confirmed = await confirm({
                message: t("confirmDelete"),
                confirmText: t("delete"),
                danger: true
              });
              if (confirmed) onDelete();
            }}
            className="min-h-12 rounded bg-danger-crisp px-5 py-3 text-label-caps font-bold uppercase text-white hover:bg-danger-crisp/90"
          >
            {t("delete")}
          </button>
        ) : <div />}
        <button type="submit" className="min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary">{t("save")}</button>
      </div>
    </form>
  );
}
