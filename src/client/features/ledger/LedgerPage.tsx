import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Edit2, Filter, Lock, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../../shared/api/client";
import { EmptyState, LoadingState, Money, MobileHeader, LocalizedDateInput, ErrorState } from "../../shared/components/ui";
import { displayText } from "../../shared/i18n/display";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { useConfirm } from "../../app/providers";
import { formatDate, getPresetDateRange, todayIso, PERIOD_OPTIONS } from "../../shared/lib/dates";
import type { DateRangePreset } from "../../shared/lib/dates";
import { formatMoney } from "../../../shared/finance/money";
import { TransactionItem } from "../../shared/components/TransactionItem";
import { useTransactionModal } from "../../shared/components/TransactionModal";
import type { Account, Category, CurrencyCode, Member, TransactionType, TransactionView } from "../../../shared/types/domain";

const transactionTypes: TransactionType[] = ["expense", "income", "transfer", "loan", "debt", "debt_collection", "repayment"];

export function LedgerPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { openNew, openEdit } = useTransactionModal();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("month");
  const [activeRange, setActiveRange] = useState(() => getPresetDateRange("month"));
  const [tempCustomRange, setTempCustomRange] = useState(() => getPresetDateRange("month"));
  const [accountFilter, setAccountFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mobileFilterType, setMobileFilterType] = useState<string>("");
  const [allTransactions, setAllTransactions] = useState<TransactionView[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: apiClient.accounts });
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: apiClient.members });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: apiClient.categories });

  const selectedRange = useMemo(() => {
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
      setTempCustomRange(selectedRange);
    }
  };

  const handleApplyCustomRange = () => {
    setActiveRange(tempCustomRange);
  };
  const txQueryString = useMemo(() => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (type) query.set("type", type);
    if (selectedRange.from) query.set("from", selectedRange.from);
    if (selectedRange.to) query.set("to", selectedRange.to);
    if (accountFilter) query.set("account_id", accountFilter);
    if (memberFilter) query.set("member_id", memberFilter);
    if (categoryFilter) query.set("category_id", categoryFilter);
    query.set("limit", "200");
    return query.toString() ? `?${query.toString()}` : "";
  }, [accountFilter, categoryFilter, memberFilter, search, selectedRange.from, selectedRange.to, type]);
  const transactionsQuery = useQuery({ queryKey: ["transactions", txQueryString], queryFn: () => apiClient.transactions(txQueryString) });

  // Track previous query string to detect actual changes (not just remounts)
  const prevQueryStringRef = useRef(txQueryString);

  // Reset pagination when filters actually change (not on initial mount)
  useEffect(() => {
    if (prevQueryStringRef.current !== txQueryString) {
      setAllTransactions([]);
      setHasMore(true);
      prevQueryStringRef.current = txQueryString;
    }
  }, [txQueryString]);

  // Update allTransactions when query data changes
  useEffect(() => {
    if (transactionsQuery.data) {
      setAllTransactions(transactionsQuery.data);
      setHasMore(transactionsQuery.data.length === 200);
    }
  }, [transactionsQuery.data]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const query = new URLSearchParams(txQueryString.slice(1));
      query.set("cursor", String(allTransactions.length));
      const moreTransactions = await apiClient.transactions(`?${query.toString()}`);

      if (moreTransactions.length === 0) {
        setHasMore(false);
      } else {
        setAllTransactions(prev => [...prev, ...moreTransactions]);
        setHasMore(moreTransactions.length === 200);
      }
    } catch (error) {
      console.error("Failed to load more transactions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    }
  });

  const lockDate = settingsQuery.data?.global_lock_until_date ?? "1970-01-01";

  const getParsedDateParts = (dateStr: string, loc: "en" | "vi") => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { dayNum: "", weekday: "", monthYear: "" };
    }
    const dayNum = String(date.getDate()).padStart(2, "0");

    const intlLocale = loc === "vi" ? "vi-VN" : "en-US";
    const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: "long" }).format(date);
    const monthYear = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(date);

    return { dayNum, weekday, monthYear };
  };

  if (accountsQuery.isLoading || membersQuery.isLoading || categoriesQuery.isLoading) {
    return <LoadingState />;
  }
  if (transactionsQuery.error) {
    return <ErrorState error={transactionsQuery.error} />;
  }

  const transactions = allTransactions;
  const accounts = accountsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const categoryOptions = categories.filter((category) => category.is_active);
  const currency = (settingsQuery.data?.default_currency ?? "USD") as CurrencyCode;

  function clearFilters() {
    setSearch("");
    setType("");
    setRangePreset("month");
    setActiveRange(getPresetDateRange("month"));
    setTempCustomRange(getPresetDateRange("month"));
    setAccountFilter("");
    setMemberFilter("");
    setCategoryFilter("");
  }

  const groupedTransactions = (() => {
    const groups: Record<string, {
      date: string;
      items: TransactionView[];
      totalIncome: number;
      totalExpense: number;
    }> = {};

    transactions.forEach((tx) => {
      const d = tx.transaction_date;
      if (!groups[d]) {
        groups[d] = {
          date: d,
          items: [],
          totalIncome: 0,
          totalExpense: 0
        };
      }
      groups[d].items.push(tx);
      if (tx.type === "income" || tx.type === "debt_collection" || tx.type === "debt") {
        groups[d].totalIncome += tx.amount;
      } else if (tx.type === "expense" || tx.type === "repayment") {
        groups[d].totalExpense += tx.amount;
      }
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  })();

  return (
    <div className="flex flex-col gap-4 pb-24 w-full">
      {/* Desktop view */}
      <div className="hidden md:flex flex-col gap-stack-lg">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-headline-lg font-bold text-primary md:text-display-kpi-mobile">{t("ledger")}</h1>
          </div>
          <button type="button" className="hidden rounded bg-primary px-4 py-3 text-label-caps font-bold uppercase text-on-primary md:inline-flex" onClick={openNew}>
            {t("addTransaction")}
          </button>
        </header>

        <section className="surface-card p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="label">{t("filters")}</h2>
            <button type="button" className="rounded px-3 py-2 text-label-caps font-bold uppercase text-secondary hover:bg-surface-container" onClick={clearFilters}>
              {t("clearFilters")}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input className="field !pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} />
            </label>
            <label className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <select className="field pl-10 pr-10" value={type} onChange={(event) => setType(event.target.value)}>
                <option value="">{t("all")}</option>
                {transactionTypes.map((item) => (
                  <option key={item} value={item}>{t(item)}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{t("period")}</span>
              <select className="field pr-10" value={rangePreset} onChange={(event) => handlePresetChange(event.target.value as DateRangePreset)}>
                {PERIOD_OPTIONS.map((preset) => <option key={preset} value={preset}>{t(preset)}</option>)}
                <option value="custom">{t("custom")}</option>
              </select>
            </label>
            <label>
              <span className="sr-only">{t("account")}</span>
              <select className="field pr-10" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
                <option value="">{t("account")}: {t("all")}</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{displayText(account.name, locale)}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">{t("member")}</span>
              <select className="field pr-10" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
                <option value="">{t("member")}: {t("all")}</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">{t("category")}</span>
              <select className="field pr-10" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">{t("category")}: {t("all")}</option>
                {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.parent_id ? "  " : ""}{displayText(category.name, locale)}</option>)}
              </select>
            </label>
          </div>
          {rangePreset === "custom" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
        </section>

        <section className="surface-card overflow-hidden">
          <div className="hidden grid-cols-[110px_1.4fr_1fr_1fr_1fr_120px_64px] gap-4 border-b border-border-subtle bg-surface-container-low p-4 label md:grid">
            <span>{t("date")}</span>
            <span>{t("description")}</span>
            <span>{t("category")}</span>
            <span>{t("member")}</span>
            <span>{t("account")}</span>
            <span className="text-right">{t("amount")}</span>
            <span></span>
          </div>
          {transactions.length === 0 ? (
            <div className="p-4"><EmptyState label={t("noData")} /></div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {transactions.map((transaction) => {
                const locked = transaction.transaction_date <= lockDate;
                const amountClass = transaction.type === "income" || transaction.type === "debt_collection" || transaction.type === "debt" ? "text-success-emerald" : transaction.type === "transfer" ? "text-primary" : "text-danger-crisp";
                return (
                  <article key={transaction.id} className="grid gap-2 p-4 md:gap-4 md:grid-cols-[110px_1.4fr_1fr_1fr_1fr_120px_64px] md:items-center">
                    <div className="flex items-center gap-2 font-data-mono text-data-mono text-on-surface-variant">
                      {locked ? <Lock size={14} className="text-warning-orange" /> : null}
                      {formatDate(transaction.transaction_date, locale)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-on-surface" title={displayText(transaction.description, locale) || t(transaction.type)}>{displayText(transaction.description, locale) || t(transaction.type)}</p>
                      <p className="truncate text-sm text-on-surface-variant md:hidden">
                        {transaction.member_name} · {displayText(transaction.account_name, locale)}
                        {transaction.category_name ? (
                          <>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span className="text-secondary font-medium">{displayText(transaction.category_name, locale)}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className={`hidden min-w-0 truncate text-sm md:block ${transaction.category_name ? "text-secondary font-medium" : "text-on-surface-variant"}`} title={displayText(transaction.category_name, locale) || t(transaction.type)}>{displayText(transaction.category_name, locale) || t(transaction.type)}</div>
                    <div className="hidden min-w-0 truncate text-sm text-on-surface-variant md:block" title={transaction.member_name}>{transaction.member_name}</div>
                    <div className="hidden min-w-0 truncate text-sm text-on-surface-variant md:block" title={displayText(transaction.account_name, locale)}>{displayText(transaction.account_name, locale)}</div>
                    
                    <div className="flex items-center justify-between gap-3 md:block md:text-right">
                      <Money amount={transaction.amount} currency={transaction.currency} locale={locale} className={`font-bold ${amountClass}`} />
                      <div className="action-group md:hidden">
                        <button type="button" className="action-group-btn" disabled={locked} onClick={() => !locked && openEdit(transaction.id)} aria-label={t("editTransaction")}>
                          <Edit2 size={14} />
                        </button>
                        <div className="action-group-divider" />
                        <button type="button" className="action-group-btn danger" disabled={locked} onClick={() => deleteMutation.mutate(transaction.id)} aria-label={t("deleteTransaction")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="hidden justify-end md:flex">
                      <div className="action-group">
                        <button type="button" className="action-group-btn" disabled={locked} onClick={() => !locked && openEdit(transaction.id)} aria-label={t("editTransaction")}>
                          <Edit2 size={14} />
                        </button>
                        <div className="action-group-divider" />
                        <button type="button" className="action-group-btn danger" disabled={locked} onClick={() => deleteMutation.mutate(transaction.id)} aria-label={t("deleteTransaction")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {transactions.length > 0 && hasMore && (
            <div className="p-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="min-h-12 rounded bg-primary px-6 py-3 text-label-caps font-bold uppercase text-on-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? t("loading") : t("loadMore")}
              </button>
            </div>
          )}
          {transactions.length > 0 && !hasMore && (
            <div className="p-4 text-center text-on-surface-variant text-sm">
              {t("noMoreTransactions")}
            </div>
          )}
        </section>
      </div>

      {/* Mobile view */}
      <div className="md:hidden flex flex-col w-full min-h-screen bg-surface-muted pb-24">
        <MobileHeader title={t("ledger")} />

        <main className="flex-1 flex flex-col w-full px-margin-mobile py-stack-md gap-4">
          {/* Search */}
          <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            className="w-full h-10 bg-surface-container-low border border-border-subtle rounded-xl pl-9 pr-3 text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Chips Scrollable Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-margin-mobile px-margin-mobile">
          {/* Period Filter */}
          <button
            onClick={() => setMobileFilterType("period")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border shadow-sm transition-colors ${
              rangePreset !== "month" ? "bg-secondary/10 text-secondary border-secondary/30" : "bg-surface-container text-on-surface-variant border-border-subtle"
            }`}
          >
            {rangePreset === "custom"
              ? `${formatDate(activeRange.from, locale)} - ${formatDate(activeRange.to, locale)}`
              : t(rangePreset)}
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          {/* Type Filter */}
          <button
            onClick={() => setMobileFilterType("type")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border shadow-sm transition-colors ${
              type ? "bg-secondary/10 text-secondary border-secondary/30" : "bg-surface-container text-on-surface-variant border-border-subtle"
            }`}
          >
            {type ? t(type) : t("type") + ": " + t("filterAll")}
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          {/* Category Filter */}
          <button
            onClick={() => setMobileFilterType("category")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border shadow-sm transition-colors ${
              categoryFilter ? "bg-secondary/10 text-secondary border-secondary/30" : "bg-surface-container text-on-surface-variant border-border-subtle"
            }`}
          >
            {categoryFilter ? displayText(categories.find(c => c.id === categoryFilter)?.name ?? "", locale) : t("category") + ": " + t("all")}
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          {/* Account Filter */}
          <button
            onClick={() => setMobileFilterType("account")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border shadow-sm transition-colors ${
              accountFilter ? "bg-secondary/10 text-secondary border-secondary/30" : "bg-surface-container text-on-surface-variant border-border-subtle"
            }`}
          >
            {accountFilter ? displayText(accounts.find(a => a.id === accountFilter)?.name ?? "", locale) : t("account") + ": " + t("all")}
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
          {/* Member Filter */}
          <button
            onClick={() => setMobileFilterType("member")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border shadow-sm transition-colors ${
              memberFilter ? "bg-secondary/10 text-secondary border-secondary/30" : "bg-surface-container text-on-surface-variant border-border-subtle"
            }`}
          >
            {memberFilter ? members.find(m => m.id === memberFilter)?.name : t("member") + ": " + t("all")}
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>
        </div>

        {/* Mobile Filter Bottom Sheet */}
        {mobileFilterType ? (
          <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileFilterType("")}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-border-subtle rounded-full" />
              </div>
              <div className="px-margin-mobile pb-2 border-b border-border-subtle">
                <h2 className="text-body-lg font-semibold capitalize">{t(mobileFilterType) || mobileFilterType}</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-margin-mobile">
                {mobileFilterType === "period" && (
                  <div className="space-y-1">
                    {[...PERIOD_OPTIONS, "custom"].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          handlePresetChange(preset as DateRangePreset);
                          setMobileFilterType("");
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          rangePreset === preset ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {t(preset)}
                      </button>
                    ))}
                    {rangePreset === "custom" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="label text-[10px]">{t("from")}</span>
                          <LocalizedDateInput
                            className="field text-sm"
                            value={tempCustomRange.from}
                            onChange={(val) => setTempCustomRange((current) => ({ ...current, from: val }))}
                            locale={locale}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="label text-[10px]">{t("to")}</span>
                          <LocalizedDateInput
                            className="field text-sm"
                            value={tempCustomRange.to}
                            onChange={(val) => setTempCustomRange((current) => ({ ...current, to: val }))}
                            locale={locale}
                          />
                        </label>
                        <button
                          onClick={() => { handleApplyCustomRange(); setMobileFilterType(""); }}
                          className="col-span-2 h-10 rounded bg-primary text-sm font-semibold text-on-primary"
                        >
                          {t("apply")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {mobileFilterType === "type" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => { setType(""); setMobileFilterType(""); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                        !type ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {t("filterAll")}
                    </button>
                    {transactionTypes.map((item) => (
                      <button
                        key={item}
                        onClick={() => { setType(item); setMobileFilterType(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          type === item ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {t(item)}
                      </button>
                    ))}
                  </div>
                )}
                {mobileFilterType === "account" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => { setAccountFilter(""); setMobileFilterType(""); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                        !accountFilter ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {t("filterAll")}
                    </button>
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => { setAccountFilter(account.id); setMobileFilterType(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          accountFilter === account.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {displayText(account.name, locale)}
                      </button>
                    ))}
                  </div>
                )}
                {mobileFilterType === "member" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => { setMemberFilter(""); setMobileFilterType(""); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                        !memberFilter ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {t("filterAll")}
                    </button>
                    {members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => { setMemberFilter(member.id); setMobileFilterType(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          memberFilter === member.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                )}
                {mobileFilterType === "category" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => { setCategoryFilter(""); setMobileFilterType(""); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                        !categoryFilter ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      {t("filterAll")}
                    </button>
                    {categoryOptions.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => { setCategoryFilter(category.id); setMobileFilterType(""); }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          categoryFilter === category.id ? "bg-secondary/10 text-secondary font-semibold" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {category.parent_id ? "  " : ""}{displayText(category.name, locale)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Date Grouped Transaction List */}
        <div className="flex flex-col gap-4">
          {groupedTransactions.map((group) => {
            const { dayNum, weekday, monthYear } = getParsedDateParts(group.date, locale);
            return (
              <div key={group.date} className="flex flex-col gap-2">
                {/* Date Group Header */}
                <div className="bg-surface-container-lowest flex justify-between items-center py-1.5 px-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary font-data-mono leading-none">{dayNum}</span>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-semibold text-on-surface leading-none mb-0.5">{weekday}</span>
                      <span className="text-[9px] text-on-surface-variant leading-none uppercase tracking-wider font-medium">{monthYear}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-[11px] font-data-mono font-bold">
                    {group.totalIncome > 0 && (
                      <span className="text-success-emerald">+{formatMoney(group.totalIncome, currency, locale)}</span>
                    )}
                    {group.totalExpense > 0 && (
                      <span className="text-danger-crisp">-{formatMoney(group.totalExpense, currency, locale)}</span>
                    )}
                  </div>
                </div>

                {/* Group Items */}
                <div className="flex flex-col gap-2">
                  {group.items.map((tx) => {
                    const locked = tx.transaction_date <= lockDate;
                    return (
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        showDate={false}
                        showCategory={true}
                        locked={locked}
                        onClick={() => !locked && openEdit(tx.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant text-sm bg-surface-container-lowest rounded-xl border border-border-subtle">
              {t("noData")}
            </div>
          )}
        </div>

        {/* Load More Button for Mobile */}
        {transactions.length > 0 && hasMore && (
          <div className="px-margin-mobile py-4 flex justify-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="w-full max-w-sm min-h-12 rounded-lg bg-primary px-6 py-3 text-label-caps font-bold uppercase text-on-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoadingMore ? t("loading") : t("loadMore")}
            </button>
          </div>
        )}
        {transactions.length > 0 && !hasMore && (
          <div className="px-margin-mobile py-4 text-center text-on-surface-variant text-sm">
            {t("noMoreTransactions")}
          </div>
        )}
        </main>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={openNew}
        className="fixed bottom-24 right-4 bg-secondary text-on-secondary rounded-full w-14 h-14 flex items-center justify-center shadow-lg md:hidden hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-transform active:scale-95 z-40"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

    </div>
  );
}

