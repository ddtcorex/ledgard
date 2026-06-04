import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Category, CurrencyCode, Member, RecurringBudget, RecurringBudgetFrequency } from "../../../../shared/types/domain";
import { fromMajorUnits, toMajorUnits } from "../../../../shared/finance/money";
import { zeroDecimalCurrencies } from "../../../../shared/constants/currencies";
import { ErrorState } from "../../../shared/components/ui";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { useCreateRecurringBudget, useUpdateRecurringBudget } from "../hooks/useBudgets";

export function RecurringBudgetForm({
  recurringBudget,
  categories,
  members,
  currency,
  onDone
}: {
  recurringBudget: RecurringBudget | null;
  categories: Category[];
  members: Member[];
  currency: CurrencyCode;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Default month format YYYY-MM
  const defaultStartMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const defaultEndMonth = recurringBudget?.end_year
    ? `${recurringBudget.end_year}-${String(recurringBudget.end_month).padStart(2, "0")}`
    : "";

  const expenseCategories = categories.filter(
    (cat) => cat.type === "expense" && (cat.is_active || cat.id === recurringBudget?.category_id)
  );
  const parentCategories = expenseCategories.filter((cat) => !cat.parent_id);
  const childCategories = expenseCategories.filter((cat) => cat.parent_id);

  const [localAmount, setLocalAmount] = useState<string>(recurringBudget ? String(toMajorUnits(recurringBudget.amount, recurringBudget.currency)) : "");
  const [form, setForm] = useState({
    category_id: recurringBudget?.category_id ?? childCategories[0]?.id ?? "",
    member_id: recurringBudget?.member_id ?? "",
    amount: recurringBudget ? String(toMajorUnits(recurringBudget.amount, recurringBudget.currency)) : "",
    frequency: (recurringBudget?.frequency ?? "monthly") as RecurringBudgetFrequency,
    start_month: recurringBudget ? `${recurringBudget.start_year}-${String(recurringBudget.start_month).padStart(2, "0")}` : defaultStartMonth,
    end_month: defaultEndMonth,
    is_active: recurringBudget?.is_active ?? 1
  });

  // Sync localAmount with form.amount (for editing)
  useEffect(() => {
    if (recurringBudget && form.amount) {
      setLocalAmount(form.amount);
    }
  }, [recurringBudget, form.amount]);

  const createMutation = useCreateRecurringBudget();
  const updateMutation = useUpdateRecurringBudget();

  const mutation = recurringBudget ? updateMutation : createMutation;

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
      const cleaned = raw.replace(/[^\d]/g, "");
      setLocalAmount(cleaned);
      setForm((f) => ({ ...f, amount: cleaned }));
    } else {
      const groupSep = locale === "vi" ? "." : ",";
      const decimalSep = locale === "vi" ? "," : ".";
      let cleaned = raw.replaceAll(groupSep, "");
      cleaned = cleaned.replace(decimalSep, ".");
      cleaned = cleaned.replace(/[^\d.]/g, "");
      const parts = cleaned.split(".");
      if (parts.length > 2) {
        cleaned = parts[0] + "." + parts.slice(1).join("");
      }
      setLocalAmount(cleaned);
      setForm((f) => ({ ...f, amount: cleaned }));
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    // Extract year and month from YYYY-MM format
    const [startYear, startMonth] = form.start_month.split("-").map(Number);
    const [endYear, endMonth] = form.end_month ? form.end_month.split("-").map(Number) : [null, null];

    if (recurringBudget) {
      updateMutation.mutate(
        {
          id: recurringBudget.id,
          data: {
            amount: fromMajorUnits(Number(form.amount), currency),
            is_active: form.is_active,
            end_month: endMonth,
            end_year: endYear
          }
        },
        { onSuccess: onDone }
      );
    } else {
      createMutation.mutate(
        {
          category_id: form.category_id,
          member_id: form.member_id || null,
          amount: fromMajorUnits(Number(form.amount), currency),
          currency,
          frequency: form.frequency,
          start_month: startMonth,
          start_year: startYear,
          end_month: endMonth,
          end_year: endYear
        },
        { onSuccess: onDone }
      );
    }
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
      {mutation.error && (
        <div className="md:col-span-2">
          <ErrorState error={mutation.error} />
        </div>
      )}

      <label className="space-y-1">
        <span className="label">{t("category")}</span>
        <select
          className="field"
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          disabled={!!recurringBudget}
          required
        >
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
        <select
          className="field"
          value={form.member_id}
          onChange={(e) => setForm({ ...form, member_id: e.target.value })}
          disabled={!!recurringBudget}
        >
          <option value="">{t("shared")}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="label">{t("amount")}</span>
        <input
          className="field font-data-mono tabular"
          type="text"
          inputMode="decimal"
          value={displayAmount}
          onChange={(e) => handleAmountInput(e.target.value)}
          required
        />
      </label>

      <label className="space-y-1">
        <span className="label">{t("frequency")}</span>
        <select
          className="field"
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringBudgetFrequency })}
          disabled={!!recurringBudget}
          required
        >
          <option value="monthly">{t("monthly")}</option>
          <option value="quarterly">{t("quarterly")}</option>
          <option value="yearly">{t("yearly")}</option>
        </select>
      </label>

      <label className="space-y-1">
        <span className="label">{t("startDate")}</span>
        <input
          type="month"
          className="field font-data-mono tabular"
          value={form.start_month}
          onChange={(e) => setForm({ ...form, start_month: e.target.value })}
          disabled={!!recurringBudget}
          required
        />
      </label>

      <label className="space-y-1">
        <span className="label">{t("endDate")}</span>
        <input
          type="month"
          className="field font-data-mono tabular"
          value={form.end_month}
          onChange={(e) => setForm({ ...form, end_month: e.target.value })}
          placeholder="YYYY-MM"
        />
      </label>

      {recurringBudget && (
        <label className="space-y-1 md:col-span-2">
          <span className="label">{t("status")}</span>
          <select
            className="field"
            value={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
          >
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </select>
        </label>
      )}

      <div className="flex justify-end md:col-span-2">
        <button
          type="submit"
          className="min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary"
          disabled={mutation.isPending}
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
}