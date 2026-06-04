import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, UserCheck } from "lucide-react";
import { FormEvent, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../api/client";
import { EmptyState, ErrorState, Modal, LocalizedDateInput } from "./ui";
import { displayText } from "../i18n/display";
import { useI18n } from "../i18n/I18nProvider";
import { useCurrentUser, useConfirm } from "../../app/providers";
import { formatDate, todayIso } from "../lib/dates";
import { getCategoryIcon } from "../lib/categories";
import { fromMajorUnits, toMajorUnits } from "../../../shared/finance/money";
import { zeroDecimalCurrencies } from "../../../shared/constants/currencies";
import type { Account, Category, CurrencyCode, Member, TransactionType, TransactionView } from "../../../shared/types/domain";

const transactionTypes: TransactionType[] = ["expense", "income", "transfer", "loan", "debt", "debt_collection", "repayment"];
const mainTransactionTypes: TransactionType[] = ["expense", "income"];
const additionalTransactionTypes: TransactionType[] = ["transfer", "loan", "debt", "debt_collection", "repayment"];

// ─── Context ──────────────────────────────────────────────

interface TransactionModalContextValue {
  openNew: () => void;
  openEdit: (id: string) => void;
}

const TransactionModalContext = createContext<TransactionModalContextValue>({
  openNew: () => {},
  openEdit: () => {},
});

export function useTransactionModal() {
  return useContext(TransactionModalContext);
}

// ─── Provider ─────────────────────────────────────────────

export function TransactionModalProvider({ children }: { children: React.ReactNode }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: apiClient.accounts });
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: apiClient.members });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: apiClient.categories });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });

  const currency = (settingsQuery.data?.default_currency ?? "USD") as CurrencyCode;
  const accounts = accountsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  // Fetch transaction by ID for editQuery.data
  const editQuery = useQuery({
    queryKey: ["transaction", loadingId],
    queryFn: () => apiClient.transaction(loadingId!),
    enabled: Boolean(loadingId),
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteTransaction,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["transaction"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["category-report"] });
      queryClient.invalidateQueries({ queryKey: ["member-report"] });
      queryClient.invalidateQueries({ queryKey: ["income-expense"] });
      close();
    }
  });

  const openNew = () => {
    setLoadingId(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setLoadingId(id);
    setModalOpen(true);
  };

  const close = () => {
    setLoadingId(null);
    setModalOpen(false);
    // Remove cached transaction so re-opening always fetches fresh data
    queryClient.removeQueries({ queryKey: ["transaction"] });
  };

  const isOpen = modalOpen && accounts.length > 0;
  const showLoading = modalOpen && Boolean(loadingId);

  return (
    <TransactionModalContext.Provider value={{ openNew, openEdit }}>
      {children}

      {/* Loading overlay while fetching transaction for editQuery.data */}
      {showLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-xl">
            <p className="text-body-md text-on-surface-variant">{t("loading")}</p>
          </div>
        </div>
      ) : null}

      {/* Desktop Modal */}
      {isOpen ? (
        <div className="hidden md:block">
          <Modal
            title={editQuery.data ? t("editTransaction") : t("addTransaction")}
            onClose={close}
          >
            <TransactionForm
              key={editQuery.data?.id ?? "new"}
              transaction={editQuery.data ?? null}
              accounts={accounts}
              members={members}
              categories={categories}
              currency={currency}
              onClose={close}
              onDone={() => {
                close();
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                queryClient.invalidateQueries({ queryKey: ["overview"] });
                queryClient.invalidateQueries({ queryKey: ["accounts"] });
                queryClient.invalidateQueries({ queryKey: ["budgets"] });
                queryClient.invalidateQueries({ queryKey: ["category-report"] });
                queryClient.invalidateQueries({ queryKey: ["member-report"] });
                queryClient.invalidateQueries({ queryKey: ["income-expense"] });
              }}
              onDelete={editQuery.data ? () => {
                deleteMutation.mutate(editQuery.data.id);
              } : undefined}
            />
          </Modal>
        </div>
      ) : null}

      {/* Mobile Full-Screen Form */}
      {isOpen ? (
        <div className="md:hidden">
          <TransactionForm
            key={loadingId ?? "new"}
            transaction={editQuery.data ?? null}
            accounts={accounts}
            members={members}
            categories={categories}
            currency={currency}
            onClose={close}
            onDone={() => {
              close();
              queryClient.invalidateQueries({ queryKey: ["transactions"] });
              queryClient.invalidateQueries({ queryKey: ["overview"] });
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              queryClient.invalidateQueries({ queryKey: ["budgets"] });
              queryClient.invalidateQueries({ queryKey: ["category-report"] });
              queryClient.invalidateQueries({ queryKey: ["member-report"] });
              queryClient.invalidateQueries({ queryKey: ["income-expense"] });
            }}
            onDelete={editQuery.data ? () => {
              deleteMutation.mutate(editQuery.data.id);
            } : undefined}
          />
        </div>
      ) : null}
    </TransactionModalContext.Provider>
  );
}

// ─── TransactionForm ───────────────────────────────────────

function TransactionForm({
  transaction,
  accounts,
  members,
  categories,
  currency,
  onClose,
  onDone,
  onDelete
}: {
  transaction: TransactionView | null;
  accounts: Account[];
  members: Member[];
  categories: Category[];
  currency: CurrencyCode;
  onClose: () => void;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const { t, locale } = useI18n();
  const { currentUser } = useCurrentUser();
  const { confirm } = useConfirm();
  const isAdmin = currentUser?.role === "admin";
  const [mobileFormField, setMobileFormField] = useState<string>("");
  const [expandedParentId, setExpandedParentId] = useState<string>("");
  const mobileAmountInputRef = useRef<HTMLInputElement>(null);

  // Reset expanded category when picker closes or type changes
  useEffect(() => {
    if (mobileFormField !== "category") {
      setExpandedParentId("");
    }
  }, [mobileFormField]);

  const [localAmount, setLocalAmount] = useState<string>(transaction ? String(toMajorUnits(transaction.amount, transaction.currency)) : "");
  const [amountFocused, setAmountFocused] = useState(false);

  const [form, setForm] = useState({
    type: transaction?.type ?? "expense",
    amount: transaction ? String(toMajorUnits(transaction.amount, transaction.currency)) : "",
    account_id: transaction?.account_id ?? accounts[0]?.id ?? "",
    destination_account_id: transaction?.destination_account_id ?? accounts[1]?.id ?? "",
    member_id: transaction?.member_id ?? currentUser?.id ?? members[0]?.id ?? "",
    category_id: transaction?.category_id ?? "",
    transaction_date: transaction?.transaction_date ?? todayIso(),
    description: transaction?.description ?? ""
  });

  // Sync form when transaction prop arrives asynchronously (e.g. URL-based editQuery.data)
  useEffect(() => {
    if (transaction) {
      const majorAmount = String(toMajorUnits(transaction.amount, transaction.currency));
      setForm({
        type: transaction.type,
        amount: majorAmount,
        account_id: transaction.account_id,
        destination_account_id: transaction.destination_account_id ?? accounts[1]?.id ?? "",
        member_id: transaction.member_id ?? currentUser?.id ?? members[0]?.id ?? "",
        category_id: transaction.category_id ?? "",
        transaction_date: transaction.transaction_date,
        description: transaction.description ?? ""
      });
      setLocalAmount(majorAmount);
    }
  }, [transaction]);

  // Once current user loads, set member_id default if not editQuery.data an existing transaction
  useEffect(() => {
    if (!transaction && currentUser && !form.member_id) {
      setForm((current) => ({ ...current, member_id: currentUser.id }));
    }
  }, [currentUser, transaction]);

  // Sync localAmount with form.amount (for editQuery.data)
  useEffect(() => {
    if (transaction && form.amount) {
      setLocalAmount(form.amount);
    }
  }, [transaction, form.amount]);

  // Reset expanded parent when transaction type changes or category picker opens/closes
  useEffect(() => {
    if (mobileFormField === "category") {
      const selectedCategory = categories.find(c => c.id === form.category_id);
      setExpandedParentId(selectedCategory?.parent_id ?? "");
    } else {
      setExpandedParentId("");
    }
  }, [form.type, mobileFormField, categories, form.category_id]);

  const allTxQuery = useQuery({
    queryKey: ["transactions", "all_frequency"],
    queryFn: () => apiClient.transactions("?limit=1000")
  });
  const allTransactions = allTxQuery.data ?? [];

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of allTransactions) {
      if (tx.category_id) {
        counts[tx.category_id] = (counts[tx.category_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [allTransactions]);

  const selectableCategories = useMemo(() => {
    const list = categories.filter((category) => category.parent_id && category.type === form.type);
    return [...list].sort((a, b) => {
      const countA = categoryCounts[a.id] ?? 0;
      const countB = categoryCounts[b.id] ?? 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return displayText(a.name, locale).localeCompare(displayText(b.name, locale));
    });
  }, [categories, form.type, categoryCounts, locale]);

  useEffect(() => {
    if (form.type === "income" || form.type === "expense") {
      const currentValid = selectableCategories.some((c) => c.id === form.category_id);
      if (!currentValid) {
        const firstCategory = selectableCategories[0];
        if (firstCategory) setForm((current) => ({ ...current, category_id: firstCategory.id }));
      }
    }
  }, [selectableCategories, form.category_id, form.type]);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        amount: fromMajorUnits(Number(form.amount), currency),
        currency,
        type: form.type as TransactionType,
        account_id: form.account_id,
        destination_account_id: form.type === "transfer" ? form.destination_account_id : null,
        member_id: form.member_id,
        category_id: form.type === "income" || form.type === "expense" ? form.category_id : null,
        transaction_date: form.transaction_date,
        description: form.description || null
      };
      return transaction ? apiClient.updateTransaction(transaction.id, payload) : apiClient.createTransaction(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onDone();
    }
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
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      useGrouping: true
    }).format(num);
  }, [localAmount, intlLocale]);

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
    <>
      {/* Desktop Form */}
      <form onSubmit={submit} className="hidden md:grid gap-4 md:grid-cols-2">
        {mutation.error ? <div className="md:col-span-2"><ErrorState error={mutation.error} /></div> : null}

        {/* 1. Type */}
        <label className="space-y-1">
          <span className="label">{t("type")}</span>
          <select className="field pr-10" value={form.type} onChange={(event) => update("type", event.target.value)}>
            {transactionTypes.map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
        </label>

        {/* 2. Category or Destination Account */}
        {form.type === "income" || form.type === "expense" ? (
          <label className="space-y-1">
            <span className="label">{t("category")}</span>
            <select className="field pr-10" value={form.category_id} onChange={(event) => update("category_id", event.target.value)} required>
              {selectableCategories.map((category) => <option key={category.id} value={category.id}>{displayText(category.name, locale)}</option>)}
            </select>
          </label>
        ) : form.type === "transfer" ? (
          <label className="space-y-1">
            <span className="label">{t("destination")}</span>
            <select className="field pr-10" value={form.destination_account_id} onChange={(event) => update("destination_account_id", event.target.value)} required>
              {accounts.map((account) => <option key={account.id} value={account.id}>{displayText(account.name, locale)}</option>)}
            </select>
          </label>
        ) : (
          <div className="hidden md:block" />
        )}

        {/* 3. Amount */}
        <label className="space-y-1">
          <span className="label">{t("amount")}</span>
          <input className="field font-data-mono tabular" type="text" inputMode="decimal" value={displayAmount} onChange={(event) => handleAmountInput(event.target.value)} required />
        </label>

        {/* 4. Description */}
        <label className="space-y-1">
          <span className="label">{t("description")}</span>
          <input className="field focus:outline-none" value={form.description} onChange={(event) => update("description", event.target.value)} />
        </label>

        {/* 5. Source Account */}
        <label className="space-y-1">
          <span className="label">{t("account")}</span>
          <select className="field pr-10" value={form.account_id} onChange={(event) => update("account_id", event.target.value)} required>
            {accounts.map((account) => <option key={account.id} value={account.id}>{displayText(account.name, locale)}</option>)}
          </select>
        </label>

        {/* 6. Member */}
        <label className="space-y-1">
          <span className="label flex items-center gap-1.5">
            {t("member")}
            {!isAdmin && <Lock size={12} className="text-on-surface-variant" />}
          </span>
          {isAdmin ? (
            <select className="field pr-10" value={form.member_id} onChange={(event) => update("member_id", event.target.value)} required>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          ) : (
            <div className="field flex items-center gap-2 bg-surface-muted text-on-surface-variant cursor-not-allowed select-none">
              <UserCheck size={16} className="shrink-0" />
              <span>{members.find((m) => m.id === form.member_id)?.name ?? currentUser?.name ?? ""}</span>
            </div>
          )}
        </label>

        {/* 7. Date */}
        <label className="space-y-1">
          <span className="label">{t("date")}</span>
          <LocalizedDateInput
            className="field font-data-mono tabular"
            value={form.transaction_date}
            onChange={(val) => update("transaction_date", val)}
            locale={locale}
          />
        </label>

        {/* Spacer to balance grid */}
        <div className="hidden md:block" />

        {/* 8. Save and Delete buttons */}
        <div className="flex justify-between gap-3 md:col-span-2">
          {(() => {
            if (!transaction || !onDelete) return <div />;
            const canDelete = isAdmin || transaction.member_id === currentUser?.id;
            console.log("[TransactionForm Desktop] canDelete:", canDelete, { transaction: transaction.id, isAdmin, member_id: transaction.member_id, currentUserId: currentUser?.id });
            if (!canDelete) return <div />;
            return (
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
            );
          })()}
          <button type="submit" disabled={mutation.isPending} className="w-full md:w-auto min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary">
            {t("save")}
          </button>
        </div>
      </form>

      {/* Mobile Form Layout — full-screen overlay matching design */}
      <form onSubmit={submit} className="md:hidden fixed inset-0 z-[90] flex flex-col bg-surface text-on-surface">
        {/* Header: X | Title | Lưu */}
        <header className="flex justify-between items-center w-full px-margin-mobile h-12 bg-surface border-b border-border-subtle shrink-0">
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-body-lg font-semibold text-primary">
            {transaction ? t("editTransaction") : t("addTransaction")}
          </h1>
          <button type="submit" disabled={mutation.isPending} className="text-body-md font-medium text-secondary px-2 py-1 hover:bg-surface-container rounded transition-colors">
            {t("save")}
          </button>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto w-full pb-safe">
          {mutation.error ? <div className="px-margin-mobile pt-2"><ErrorState error={mutation.error} /></div> : null}

          {/* Type tabs */}
          <div className="px-margin-mobile py-2 border-b border-border-subtle bg-surface-muted">
            <div className="flex bg-surface-container-low p-1 rounded-lg border border-border-subtle">
              {mainTransactionTypes.map((tType) => (
                <button
                  key={tType}
                  type="button"
                  onClick={() => update("type", tType)}
                  className={`flex-1 h-8 px-1 text-center text-data-mono font-data-mono transition-colors ${
                    form.type === tType
                      ? "font-bold bg-surface shadow-sm rounded border border-border-subtle text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t(tType)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMobileFormField("type")}
                className={`flex-1 h-8 px-1 text-center text-data-mono font-data-mono transition-colors ${
                  !mainTransactionTypes.includes(form.type as TransactionType)
                    ? "font-bold bg-surface shadow-sm rounded border border-border-subtle text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {!mainTransactionTypes.includes(form.type as TransactionType) ? (
                  <span className="block truncate max-w-full">{t(form.type)}</span>
                ) : (
                  <span className="material-symbols-outlined text-base">add</span>
                )}
              </button>
            </div>
          </div>

          {/* Amount display */}
          <div className="px-margin-mobile py-2 border-b border-border-subtle flex flex-col items-center justify-center bg-surface">
            <span className="text-[10px] font-bold text-on-surface-variant mb-1 uppercase tracking-wider">{t("amount")}</span>
            <div className="flex items-center gap-1">
              <span
                className="text-headline-md font-semibold"
                style={{ color: form.type === "income" ? "var(--color-success-emerald, #10B981)" : form.type === "transfer" ? "transparent" : "var(--color-danger-crisp, #E11D48)" }}
              >
                {form.type === "income" ? "+" : "-"}
              </span>
              <input
                ref={mobileAmountInputRef}
                type="text"
                inputMode="decimal"
                className="text-display-kpi-mobile font-bold bg-transparent text-center w-full p-0 text-danger-crisp [border:none] [outline:none] [box-shadow:none] focus:[border:none] focus:[outline:none] focus:[box-shadow:none]"
                style={{ color: form.type === "income" ? "var(--color-success-emerald, #10B981)" : form.type === "transfer" ? "var(--color-primary, #003441)" : undefined }}
                placeholder={amountFocused ? "" : "0"}
                value={displayAmount}
                onChange={(event) => handleAmountInput(event.target.value)}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                required
              />
              <span className="text-headline-md font-semibold text-on-surface-variant">₫</span>
            </div>
          </div>

          {/* Category grid (expense/income only) */}
          {(form.type === "income" || form.type === "expense") && selectableCategories.length > 0 ? (
            <div className="px-margin-mobile py-4 border-b border-border-subtle bg-surface">
              <p className="text-label-caps uppercase mb-3 text-on-surface-variant">{t("popularCategories")}</p>
              <div className="grid grid-cols-4 gap-y-4">
                {(() => {
                  const popularCategories = selectableCategories.slice(0, 7);
                  const isSelectedInPopular = popularCategories.some((cat) => cat.id === form.category_id);
                  const selectedCategory = categories.find((c) => c.id === form.category_id);
                  const showSelectedAsOther = form.category_id && !isSelectedInPopular && selectedCategory;

                  return (
                    <>
                      {popularCategories.map((cat) => {
                        const name = displayText(cat.name, locale);
                        const icon = getCategoryIcon(cat.icon, cat.type);
                        const selected = form.category_id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => update("category_id", cat.id)}
                            className="flex flex-col items-center gap-1 cursor-pointer group"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-transform group-active:scale-95 ${
                              selected
                                ? "bg-secondary text-on-secondary border-secondary ring-2 ring-secondary/30"
                                : "bg-surface-container text-on-surface-variant border-border-subtle"
                            }`}>
                              <span className="material-symbols-outlined text-[18px]">{icon}</span>
                            </div>
                            <span className={`text-[10px] font-medium text-center leading-tight ${selected ? "text-secondary font-bold" : "text-on-surface"}`}>
                              {name}
                            </span>
                          </button>
                        );
                      })}
                      {showSelectedAsOther ? (
                        <button
                          type="button"
                          onClick={() => setMobileFormField("category")}
                          className="flex flex-col items-center gap-1 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center border transition-transform group-active:scale-95 bg-secondary text-on-secondary border-secondary ring-2 ring-secondary/30">
                            <span className="material-symbols-outlined text-[18px]">
                              {getCategoryIcon(selectedCategory.icon, selectedCategory.type)}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-secondary text-center leading-tight truncate w-full px-0.5">
                            {displayText(selectedCategory.name, locale)}
                          </span>
                        </button>
                      ) : (
                        /* "Other" button - opens category picker */
                        <button
                          type="button"
                          onClick={() => setMobileFormField("category")}
                          className="flex flex-col items-center gap-1 cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant border border-border-subtle hover:bg-surface-container-high transition-transform group-active:scale-95">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                          </div>
                          <span className="text-[10px] font-medium text-on-surface text-center leading-tight">{t("other")}</span>
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : form.type === "transfer" ? (
            /* Transfer destination */
            <div className="flex items-center px-margin-mobile py-2.5 border-b border-border-subtle hover:bg-surface-muted transition-colors active:bg-surface-container cursor-pointer" onClick={() => setMobileFormField("destination")}>
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mr-3 border border-border-subtle shrink-0">
                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">{t("destination")}</p>
                <p className="text-[13px] text-on-surface font-medium truncate">
                  {displayText(accounts.find(a => a.id === form.destination_account_id)?.name ?? "", locale) || t("account")}
                </p>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
            </div>
          ) : null}

          {/* Note / Description row */}
          <div className="flex items-start px-margin-mobile py-2.5 border-b border-border-subtle">
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mr-3 border border-border-subtle shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[18px]">notes</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">{t("description")}</p>
              <textarea
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-[13px] resize-none h-10 text-on-surface"
                placeholder={t("enterDescription")}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          </div>

          {/* Account / Wallet row */}
          <div className="flex items-center px-margin-mobile py-2.5 border-b border-border-subtle hover:bg-surface-muted transition-colors active:bg-surface-container cursor-pointer" onClick={() => setMobileFormField("account")}>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mr-3 border border-border-subtle shrink-0">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">{t("account")}</p>
              <p className="text-[13px] text-on-surface font-medium truncate">
                {displayText(accounts.find(a => a.id === form.account_id)?.name ?? "", locale) || t("account")}
              </p>
            </div>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
          </div>

          {/* Date row */}
          <div className="flex items-center px-margin-mobile py-2.5 border-b border-border-subtle hover:bg-surface-muted transition-colors active:bg-surface-container relative cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mr-3 border border-border-subtle shrink-0">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">{t("date")}</p>
              <p className="text-[13px] text-on-surface font-medium">
                {form.transaction_date === todayIso() ? t("today") : formatDate(form.transaction_date, locale)}
              </p>
            </div>
            <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>
            <input
              type="date"
              value={form.transaction_date}
              onChange={(e) => update("transaction_date", e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Member row */}
          <div className="flex items-center px-margin-mobile py-2.5 hover:bg-surface-muted transition-colors active:bg-surface-container cursor-pointer" onClick={() => isAdmin && setMobileFormField("member")}>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mr-3 border border-border-subtle shrink-0">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">{t("member")}</p>
              <p className="text-[13px] text-on-surface font-medium truncate">
                {members.find(m => m.id === form.member_id)?.name ?? currentUser?.name ?? ""}
              </p>
            </div>
            {isAdmin && <span className="material-symbols-outlined text-outline-variant text-[18px]">chevron_right</span>}
          </div>

          {/* Delete button for mobile */}
          {transaction && onDelete && (isAdmin || transaction.member_id === currentUser?.id) && (
            <div className="px-margin-mobile py-4">
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
                className="w-full min-h-12 rounded bg-danger-crisp px-5 py-3 text-label-caps font-bold uppercase text-white hover:bg-danger-crisp/90"
              >
                {t("delete")}
              </button>
            </div>
          )}
        </main>

        {/* Mobile Form Field Picker Bottom Sheet */}
        {mobileFormField ? (
          <div className="fixed inset-0 z-[100] md:hidden" onClick={() => setMobileFormField("")}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-border-subtle rounded-full" />
              </div>
              <div className="px-margin-mobile pb-2 border-b border-border-subtle">
                <h2 className="text-body-lg font-semibold capitalize">
                  {mobileFormField === "destination" ? t("destination") : t(mobileFormField)}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-margin-mobile">
                {/* Account picker */}
                {mobileFormField === "account" && (
                  <div className="space-y-1">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => { update("account_id", account.id); setMobileFormField(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between ${
                          form.account_id === account.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <span>{displayText(account.name, locale)}</span>
                        <span className="text-xs text-on-surface-variant">{t(account.type)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Destination account picker */}
                {mobileFormField === "destination" && (
                  <div className="space-y-1">
                    {accounts.filter(a => a.id !== form.account_id).map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => { update("destination_account_id", account.id); setMobileFormField(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between ${
                          form.destination_account_id === account.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <span>{displayText(account.name, locale)}</span>
                        <span className="text-xs text-on-surface-variant">{t(account.type)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Member picker */}
                {mobileFormField === "member" && (
                  <div className="space-y-1">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => { update("member_id", member.id); setMobileFormField(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between ${
                          form.member_id === member.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <span>{member.name}</span>
                        {member.role === "admin" && <span className="text-xs text-on-surface-variant">{t("admin")}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {/* Type picker for additional transaction types */}
                {mobileFormField === "type" && (
                  <div className="space-y-1">
                    <p className="text-xs text-on-surface-variant px-3 mb-2">Loại giao dịch ít dùng - nhấn để chọn</p>
                    {additionalTransactionTypes.map((tType) => {
                      const hints: Record<string, string> = {
                        loan: "+ tài sản",
                        debt: "- tiền",
                        debt_collection: "+ tiền",
                        repayment: "- tiền"
                      };
                      return (
                        <button
                          key={tType}
                          type="button"
                          onClick={() => { update("type", tType); setMobileFormField(""); }}
                          className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${
                            form.type === tType ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">receipt_long</span>
                            <span className="font-medium">{t(tType)}</span>
                          </div>
                          <span className="text-xs text-on-surface-variant">{hints[tType]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Category picker with tree structure */}
                {mobileFormField === "category" && (
                  <div className="space-y-1">
                    {(() => {
                      const parentCategories = categories.filter(c => !c.parent_id && c.type === form.type);

                      return parentCategories.map(parent => {
                        const children = categories.filter(c => c.parent_id === parent.id);
                        const hasChildren = children.length > 0;
                        const isParentSelected = form.category_id === parent.id;
                        const isExpanded = expandedParentId === parent.id;
                        const parentIcon = getCategoryIcon(parent.icon, parent.type);

                        return (
                          <div key={parent.id}>
                            <button
                              type="button"
                              onClick={() => {
                                if (hasChildren) {
                                  setExpandedParentId(isExpanded ? "" : parent.id);
                                } else {
                                  update("category_id", parent.id);
                                  setMobileFormField("");
                                  setExpandedParentId("");
                                  setTimeout(() => {
                                    if (mobileAmountInputRef.current) {
                                      mobileAmountInputRef.current.focus();
                                      mobileAmountInputRef.current.reportValidity();
                                    }
                                  }, 100);
                                }
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 ${
                                isParentSelected ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">{parentIcon}</span>
                              <span className="flex-1">{displayText(parent.name, locale)}</span>
                              {hasChildren && (
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                  {isExpanded ? "expand_less" : "expand_more"}
                                </span>
                              )}
                            </button>
                            {/* Children */}
                            {hasChildren && isExpanded && (
                              <div className="ml-8 space-y-1 mt-1">
                                {children.map(child => {
                                  const childIcon = getCategoryIcon(child.icon, child.type);
                                  return (
                                    <button
                                      key={child.id}
                                      type="button"
                                      onClick={() => {
                                        update("category_id", child.id);
                                        setMobileFormField("");
                                        setExpandedParentId("");
                                        setTimeout(() => {
                                          if (mobileAmountInputRef.current) {
                                            mobileAmountInputRef.current.focus();
                                            mobileAmountInputRef.current.reportValidity();
                                          }
                                        }, 100);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 ${
                                        form.category_id === child.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[16px]">{childIcon}</span>
                                      <span className="flex-1">{displayText(child.name, locale)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </>
  );
}
