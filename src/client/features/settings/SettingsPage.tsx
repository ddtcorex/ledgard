import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Edit2, Globe2, Plus, RefreshCw, Trash2, Users, WalletCards, FolderTree } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../shared/api/client";
import { ErrorState, LoadingState, Modal, Money, LocalizedDateInput, MobileHeader } from "../../shared/components/ui";
import { displayText } from "../../shared/i18n/display";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { formatDate } from "../../shared/lib/dates";
import { fromMajorUnits, toMajorUnits } from "../../../shared/finance/money";
import { supportedCurrencies, zeroDecimalCurrencies } from "../../../shared/constants/currencies";
import type { Account, AccountType, Category, CategoryType, CurrencyCode, Member, ScheduledFrequency, ScheduledTransaction, TransactionType } from "../../../shared/types/domain";
import { CategoryStructure } from "./components/CategoryStructure";
import { CategoryForm } from "./components/CategoryForm";

const accountTypes: AccountType[] = ["cash", "bank", "credit_card", "savings"];
const frequencies: ScheduledFrequency[] = ["daily", "weekly", "monthly", "yearly"];
const transactionTypes: TransactionType[] = ["expense", "income", "transfer", "loan", "debt", "debt_collection", "repayment"];

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const queryClient = useQueryClient();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState<ScheduledTransaction | null>(null);
  const [addingScheduled, setAddingScheduled] = useState(false);
  const [showingRecurring, setShowingRecurring] = useState(false);
  const [showingCategories, setShowingCategories] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [lockDate, setLockDate] = useState("1970-01-01");
  const [categoryEditor, setCategoryEditor] = useState<{ category?: Category; parent?: Category | null; type?: CategoryType } | null>(null);
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: apiClient.accounts });
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: apiClient.members });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: apiClient.categories });
  const scheduledQuery = useQuery({ queryKey: ["scheduled"], queryFn: apiClient.scheduled });
  const meQuery = useQuery({ queryKey: ["me"], queryFn: apiClient.me });

  // Sync lockDate once settings load
  useEffect(() => {
    if (settingsQuery.data?.global_lock_until_date) {
      setLockDate(settingsQuery.data.global_lock_until_date);
    }
  }, [settingsQuery.data?.global_lock_until_date]);

  const currency = (settingsQuery.data?.default_currency ?? "USD") as CurrencyCode;
  const settingsMutation = useMutation({
    mutationFn: apiClient.updateSettings,
    onSuccess: (settings) => {
      setLocale(settings.default_locale);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });
  const deleteScheduledMutation = useMutation({
    mutationFn: apiClient.deleteScheduled,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled"] })
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: apiClient.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error: any) => {
      alert(error.message || "Failed to delete category");
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: apiClient.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error: any) => {
      alert(error.message || "Failed to delete account");
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: apiClient.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (error: any) => {
      alert(error.message || "Failed to delete member");
    }
  });

  function handleDeleteAccount(id: string) {
    if (confirm(t("confirmDeleteAccount"))) {
      deleteAccountMutation.mutate(id);
    }
  }

  function handleDeleteMember(id: string) {
    if (id === currentUser?.id) {
      alert(t("cannotDeleteSelf"));
      return;
    }
    if (confirm(t("confirmDeleteMember"))) {
      deleteMemberMutation.mutate(id);
    }
  }

  const isLocked = lockDate !== "1970-01-01";
  const handleToggleLock = (checked: boolean) => {
    const nextDate = checked ? new Date().toISOString().split("T")[0] : "1970-01-01";
    setLockDate(nextDate);
    settingsMutation.mutate({
      global_lock_until_date: nextDate
    });
  };

  const handleUpdateLockDate = (nextDate: string) => {
    setLockDate(nextDate);
    settingsMutation.mutate({
      global_lock_until_date: nextDate
    });
  };

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    settingsMutation.mutate({
      default_currency: nextCurrency
    });
    setEditingCurrency(false);
  };

  const handleLanguageChange = () => {
    const nextLocale = locale === "en" ? "vi" : "en";
    settingsMutation.mutate({
      default_locale: nextLocale
    });
  };

  if (settingsQuery.isLoading || accountsQuery.isLoading || membersQuery.isLoading || meQuery.isLoading) {
    return <LoadingState />;
  }
  if (settingsQuery.error) {
    return <ErrorState error={settingsQuery.error} />;
  }

  const settings = settingsQuery.data;
  const accounts = accountsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const scheduled = scheduledQuery.data ?? [];
  const currentUser = meQuery.data;
  const isAdmin = currentUser?.role === "admin";

  const activeScheduledCount = scheduled.filter(item => item.is_active).length;

  return (
    <div className="w-full">
      {/* MOBILE VIEW */}
      <div className="md:hidden flex flex-col w-full min-h-screen bg-surface-muted pb-24">
        <MobileHeader title={t("settings")} />

        {/* Main Content Canvas */}
        <main className="flex-1 flex flex-col w-full px-margin-mobile py-stack-md gap-4">
          {/* Account Balances Vertical List */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[11px] font-label-caps text-on-surface-variant uppercase tracking-widest mb-1">{t("accounts")} &amp; {t("amount")}</h2>
            
            {accounts.map((account) => (
              <div 
                key={account.id} 
                onClick={() => setEditingAccount(account)}
                className="bg-surface-container-lowest border border-border-subtle rounded-lg p-3 flex justify-between items-center shadow-sm hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">
                      {account.type === "credit_card" ? "credit_card" : account.type === "savings" ? "savings" : "account_balance"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-body-md font-body-md font-semibold text-on-surface">{displayText(account.name, locale)}</span>
                    <span className="text-[10px] font-label-caps text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md w-fit mt-0.5 uppercase">{account.type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <Money amount={account.current_balance} currency={account.currency} locale={locale} className="text-sm font-data-mono font-bold text-primary" />
                </div>
              </div>
            ))}

            <button 
              onClick={() => setAddingAccount(true)}
              className="w-full mt-1 py-2 border border-dashed border-outline-variant text-primary rounded-lg text-sm font-body-md font-medium flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm bg-surface-container-lowest"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> {t("addAccount")}
            </button>
          </section>

          {/* Family Members */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[11px] font-label-caps text-on-surface-variant uppercase tracking-widest mb-1">{t("members")}</h2>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg flex flex-col overflow-hidden shadow-sm">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  onClick={() => setEditingMember(member)}
                  className="flex items-center justify-between p-3 border-b border-border-subtle last:border-b-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {member.avatar_url ? (
                      <div
                        className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden shadow-sm"
                        style={{
                          backgroundImage: `url('${member.avatar_url}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-body-md font-body-md font-semibold text-on-surface">{member.name}</span>
                      <span className="text-xs font-body-md text-on-surface-variant mt-0.5">
                        {member.role === "admin" ? t("roleAdmin") : t("roleMember")}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => setAddingMember(true)}
              className="w-full mt-1 py-2 border border-dashed border-outline-variant text-primary rounded-lg text-sm font-body-md font-medium flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm bg-surface-container-lowest"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> {t("addMember")}
            </button>
          </section>

          {/* Period Locking */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[11px] font-label-caps text-on-surface-variant uppercase tracking-widest mb-1">{t("periodLock")}</h2>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg flex flex-col shadow-sm">
              <div className="flex items-center justify-between p-3 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-body-md font-body-md font-semibold text-on-surface">{t("lockUntil")}</span>
                    <span className="text-xs font-body-md text-on-surface-variant max-w-[220px] leading-tight mt-0.5">
                      {t("lockSummary")}
                    </span>
                  </div>
                </div>
                {/* Toggle Switch */}
                <div 
                  onClick={() => handleToggleLock(!isLocked)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${isLocked ? "bg-secondary" : "bg-surface-container-highest"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${isLocked ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">event</span>
                  </div>
                  <span className="text-body-md font-body-md text-on-surface">{t("date")}</span>
                </div>
                <div className="relative">
                  <LocalizedDateInput
                    className={`flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-low rounded-md border border-border-subtle transition-colors text-sm font-data-mono font-medium text-primary ${!isLocked ? "opacity-50 pointer-events-none" : ""}`}
                    value={lockDate}
                    onChange={handleUpdateLockDate}
                    locale={locale}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* General Config */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[11px] font-label-caps text-on-surface-variant uppercase tracking-widest mb-1">{t("appConfiguration")}</h2>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg flex flex-col shadow-sm">
              {/* Currency */}
              <button 
                onClick={() => setEditingCurrency(true)}
                className="flex items-center justify-between p-3 border-b border-border-subtle hover:bg-surface-container-low transition-colors text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                  </div>
                  <span className="text-body-md font-body-md text-on-surface font-medium">{t("currency")}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="text-xs font-data-mono font-semibold">{currency}</span>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </div>
              </button>
              
              {/* Language */}
              <button 
                onClick={handleLanguageChange}
                className="flex items-center justify-between p-3 border-b border-border-subtle hover:bg-surface-container-low transition-colors text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">language</span>
                  </div>
                  <span className="text-body-md font-body-md text-on-surface font-medium">{t("language")}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="text-xs font-body-md">{locale === "en" ? "English" : "Tiếng Việt"}</span>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </div>
              </button>
              
              {/* Recurring Rules */}
              <button
                onClick={() => setShowingRecurring(true)}
                className="flex items-center justify-between p-3 border-b border-border-subtle hover:bg-surface-container-low transition-colors text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">update</span>
                  </div>
                  <span className="text-body-md font-body-md text-on-surface font-medium">{t("recurring")}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="text-[10px] font-label-caps bg-surface-container px-1.5 py-0.5 rounded-md uppercase">
                    {activeScheduledCount} {t("active")}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </div>
              </button>

              {/* Categories */}
              <button
                onClick={() => setShowingCategories(true)}
                className="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors text-left w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">category</span>
                  </div>
                  <span className="text-body-md font-body-md text-on-surface font-medium">{t("categoriesTab")}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="text-[10px] font-label-caps bg-surface-container px-1.5 py-0.5 rounded-md uppercase">
                    {categories.length}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
                </div>
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:flex flex-col gap-stack-lg w-full">
        <header>
          <h1 className="text-headline-lg font-bold text-primary md:text-display-kpi-mobile">{t("settings")}</h1>
        </header>

        <section className="grid gap-stack-md lg:grid-cols-2">
          <article className="surface-card p-4">
            <h2 className="mb-4 flex items-center gap-2 text-headline-md font-bold text-primary"><Globe2 size={22} /> {t("appConfiguration")}</h2>
            {settingsMutation.error ? <ErrorState error={settingsMutation.error} /> : null}
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                settingsMutation.mutate({
                  default_locale: data.get("locale") as "en" | "vi",
                  default_currency: data.get("currency") as CurrencyCode,
                  global_lock_until_date: data.get("lock") as string
                });
              }}
            >
              <label className="space-y-1">
                <span className="label">{t("language")}</span>
                <select className="field" name="locale" defaultValue={settings?.default_locale ?? locale}>
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="label">{t("currency")}</span>
                <select className="field" name="currency" defaultValue={settings?.default_currency ?? "USD"}>
                  {supportedCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.label}</option>)}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="label">{t("lockUntil")}</span>
                <LocalizedDateInput
                  className="field font-data-mono tabular"
                  value={lockDate}
                  onChange={setLockDate}
                  locale={locale}
                />
                <input type="hidden" name="lock" value={lockDate} />
              </label>
              <div className="md:col-span-2">
                <button type="submit" className="w-full md:w-auto min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary">{t("save")}</button>
              </div>
            </form>
          </article>

          <article className="surface-card p-4">
            <h2 className="mb-4 flex items-center gap-2 text-headline-md font-bold text-primary"><CalendarClock size={22} /> {t("periodLock")}</h2>
            <div className="flex min-h-[108px] flex-col justify-center gap-2 border-l-4 border-warning-orange pl-4">
              <span className="label">{t("lockedThrough")}</span>
              <span className="font-data-mono text-headline-md font-bold tabular text-primary">{formatDate(settings?.global_lock_until_date ?? "1970-01-01", locale)}</span>
              <p className="max-w-prose text-body-md text-on-surface-variant">{t("lockSummary")}</p>
            </div>
          </article>
        </section>

        <section className="grid gap-stack-md xl:grid-cols-2">
          <article className="surface-card overflow-hidden">
            <div className="border-b border-border-subtle p-4">
              <h2 className="flex items-center gap-2 text-headline-md font-bold text-primary"><WalletCards size={22} /> {t("accounts")}</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface truncate">{displayText(account.name, locale)}</p>
                    <p className="label mt-1">{t(account.type)} · {account.currency} · {account.is_active ? t("active") : t("inactive")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Money amount={account.current_balance} currency={account.currency} locale={locale} className={account.current_balance < 0 ? "text-danger-crisp" : "text-primary"} />
                    <div className="action-group">
                      <button type="button" className="action-group-btn" onClick={() => setEditingAccount(account)} aria-label={t("editAccount")}>
                        <Edit2 size={14} />
                      </button>
                      {isAdmin && (
                        <>
                          <div className="action-group-divider" />
                          <button type="button" className="action-group-btn danger" onClick={() => handleDeleteAccount(account.id)} aria-label={t("deleteAccount")}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AccountForm
              currency={currency}
              onDone={() => {
                queryClient.invalidateQueries({ queryKey: ["accounts"] });
                queryClient.invalidateQueries({ queryKey: ["overview"] });
              }}
            />
          </article>

          <article className="surface-card overflow-hidden">
            <div className="border-b border-border-subtle p-4">
              <h2 className="flex items-center gap-2 text-headline-md font-bold text-primary"><Users size={22} /> {t("members")}</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-on-surface truncate">{member.name}</span>
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase text-primary shrink-0">
                        {t(member.role === "admin" ? "roleAdmin" : "roleMember")}
                      </span>
                    </div>
                    <p className="font-data-mono text-sm text-on-surface-variant mt-1 truncate">{member.email} · {member.is_active ? t("active") : t("inactive")}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="action-group">
                      <button type="button" className="action-group-btn" onClick={() => setEditingMember(member)} aria-label={t("editMember")}>
                        <Edit2 size={14} />
                      </button>
                      {isAdmin && member.id !== currentUser?.id && (
                        <>
                          <div className="action-group-divider" />
                          <button type="button" className="action-group-btn danger" onClick={() => handleDeleteMember(member.id)} aria-label={t("deleteMember")}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <MemberForm
              onDone={() => {
                queryClient.invalidateQueries({ queryKey: ["members"] });
                queryClient.invalidateQueries({ queryKey: ["overview"] });
              }}
            />
          </article>
        </section>

        <section className="grid gap-stack-md xl:grid-cols-2">
          <article className="surface-card overflow-hidden">
            <div className="border-b border-border-subtle p-4">
              <h2 className="flex items-center gap-2 text-headline-md font-bold text-primary"><FolderTree size={22} /> {t("categoriesTab")}</h2>
            </div>
            <div className="px-4 py-3">
              <CategoryStructure
                categories={categories}
                title={t("manageCategories")}
                onAddRoot={() => setCategoryEditor({ parent: null, type: "expense" })}
                onAddChild={(parent) => setCategoryEditor({ parent, type: parent.type })}
                onEdit={(category, parent) => setCategoryEditor({ category, parent })}
                onDeleteCategory={(id) => {
                  if (confirm(t("confirmDeleteCategory"))) {
                    deleteCategoryMutation.mutate(id);
                  }
                }}
              />
            </div>
          </article>
        </section>

        <section className="surface-card overflow-hidden">
          <div className="border-b border-border-subtle p-4">
            <h2 className="flex items-center gap-2 text-headline-md font-bold text-primary"><RefreshCw size={22} /> {t("recurring")}</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {scheduled.map((item) => (
              <div key={item.id} className="grid gap-2 p-4 md:grid-cols-[1fr_120px_120px_96px] md:items-center">
                <div>
                  <p className="font-semibold">{displayText(item.description, locale) || t(item.type)}</p>
                  <p className="text-sm text-on-surface-variant">{t(item.frequency)} · {t("next")} {formatDate(item.next_run_date, locale)}</p>
                </div>
                <Money amount={item.amount} currency={item.currency} locale={locale} className="text-primary" />
                <span className="label">{item.is_active ? t("active") : t("inactive")}</span>
                <div className="flex items-center justify-end">
                  <div className="action-group">
                    <button type="button" className="action-group-btn" onClick={() => setEditingScheduled(item)} aria-label={t("editScheduled")}>
                      <Edit2 size={14} />
                    </button>
                    <div className="action-group-divider" />
                    <button type="button" className="action-group-btn danger" onClick={() => deleteScheduledMutation.mutate(item.id)} aria-label={t("deleteScheduled")}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ScheduledForm
            currency={currency}
            accounts={accounts}
            members={members}
            categories={categories}
            onDone={() => queryClient.invalidateQueries({ queryKey: ["scheduled"] })}
          />
        </section>
      </div>

      {/* MODALS AND EDITORS (COMMON / TRIGGERED BY BOTH DESKTOP AND MOBILE) */}
      {editingAccount ? (
        <Modal title={t("editAccount")} onClose={() => setEditingAccount(null)}>
          <AccountEditor
            account={editingAccount}
            isAdmin={isAdmin}
            onDelete={() => handleDeleteAccount(editingAccount.id)}
            onDone={() => {
              setEditingAccount(null);
              queryClient.invalidateQueries({ queryKey: ["accounts"] });
              queryClient.invalidateQueries({ queryKey: ["overview"] });
            }}
          />
        </Modal>
      ) : null}

      {addingAccount ? (
        <Modal title={t("addAccount")} onClose={() => setAddingAccount(false)}>
          <div className="p-4 bg-surface rounded-lg">
            <AccountForm
              currency={currency}
              onDone={() => {
                setAddingAccount(false);
                queryClient.invalidateQueries({ queryKey: ["accounts"] });
                queryClient.invalidateQueries({ queryKey: ["overview"] });
              }}
            />
          </div>
        </Modal>
      ) : null}

      {editingMember ? (
        <Modal title={t("editMember")} onClose={() => setEditingMember(null)}>
          <MemberEditor
            member={editingMember}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onDelete={() => handleDeleteMember(editingMember.id)}
            onDone={() => {
              setEditingMember(null);
              queryClient.invalidateQueries({ queryKey: ["members"] });
              queryClient.invalidateQueries({ queryKey: ["overview"] });
            }}
          />
        </Modal>
      ) : null}

      {addingMember ? (
        <Modal title={t("addMember")} onClose={() => setAddingMember(false)}>
          <div className="p-4 bg-surface rounded-lg">
            <MemberForm
              onDone={() => {
                setAddingMember(false);
                queryClient.invalidateQueries({ queryKey: ["members"] });
                queryClient.invalidateQueries({ queryKey: ["overview"] });
              }}
            />
          </div>
        </Modal>
      ) : null}

      {editingScheduled ? (
        <Modal title={t("editScheduled")} onClose={() => setEditingScheduled(null)}>
          <ScheduledForm
            scheduled={editingScheduled}
            currency={currency}
            accounts={accounts}
            members={members}
            categories={categories}
            onDone={() => {
              setEditingScheduled(null);
              queryClient.invalidateQueries({ queryKey: ["scheduled"] });
            }}
          />
        </Modal>
      ) : null}

      {addingScheduled ? (
        <Modal title={t("addScheduled")} onClose={() => setAddingScheduled(false)}>
          <div className="p-4 bg-surface rounded-lg">
            <ScheduledForm
              currency={currency}
              accounts={accounts}
              members={members}
              categories={categories}
              onDone={() => {
                setAddingScheduled(false);
                queryClient.invalidateQueries({ queryKey: ["scheduled"] });
              }}
            />
          </div>
        </Modal>
      ) : null}

      {editingCurrency ? (
        <Modal title={t("currency")} onClose={() => setEditingCurrency(false)}>
          <div className="p-4 flex flex-col gap-3">
            {supportedCurrencies.map((item) => (
              <button 
                key={item.code} 
                onClick={() => handleCurrencyChange(item.code as CurrencyCode)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${currency === item.code ? "bg-primary-fixed/20 border-primary font-bold text-primary" : "border-border-subtle hover:bg-surface-container"}`}
              >
                {item.code} · {item.label}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {categoryEditor ? (
        <Modal title={categoryEditor.category ? t("editCategory") : t("addCategory")} onClose={() => setCategoryEditor(null)}>
          <CategoryForm
            category={categoryEditor.category ?? null}
            parent={categoryEditor.parent ?? null}
            type={categoryEditor.type ?? categoryEditor.category?.type ?? "expense"}
            onDone={() => {
              setCategoryEditor(null);
              queryClient.invalidateQueries({ queryKey: ["categories"] });
              queryClient.invalidateQueries({ queryKey: ["budgets"] });
            }}
          />
        </Modal>
      ) : null}

      {showingCategories ? (
        <Modal title={t("categoriesTab")} onClose={() => setShowingCategories(false)}>
          <div className="flex flex-col w-full max-h-[80vh] overflow-y-auto">
            <CategoryStructure
              categories={categories}
              title={t("manageCategories")}
              onAddRoot={() => {
                setCategoryEditor({ parent: null, type: "expense" });
                setShowingCategories(false);
              }}
              onAddChild={(parent) => {
                setCategoryEditor({ parent, type: parent.type });
                setShowingCategories(false);
              }}
              onEdit={(category, parent) => {
                setCategoryEditor({ category, parent });
                setShowingCategories(false);
              }}
              onDeleteCategory={(id) => {
                if (confirm(t("confirmDeleteCategory"))) {
                  deleteCategoryMutation.mutate(id);
                }
              }}
            />
          </div>
        </Modal>
      ) : null}

      {showingRecurring ? (
        <Modal title={t("recurring")} onClose={() => setShowingRecurring(false)}>
          <div className="flex flex-col w-full max-h-[80vh] overflow-y-auto">
            <div className="divide-y divide-border-subtle p-2">
              {scheduled.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 hover:bg-surface-container transition-colors">
                  <div>
                    <p className="font-semibold text-[14px] text-on-surface">{displayText(item.description, locale) || t(item.type)}</p>
                    <p className="text-xs text-on-surface-variant">{t(item.frequency)} · {t("next")} {formatDate(item.next_run_date, locale)}</p>
                    <div className="mt-1">
                      <Money amount={item.amount} currency={item.currency} locale={locale} className="text-sm font-bold text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingScheduled(item);
                        setShowingRecurring(false);
                      }}
                      className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button 
                      onClick={() => deleteScheduledMutation.mutate(item.id)}
                      className="p-2 rounded-full hover:bg-red-50 text-danger-crisp"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {scheduled.length === 0 && (
                <p className="text-center text-on-surface-variant p-4">{t("noData")}</p>
              )}
            </div>
            <div className="p-3 border-t border-border-subtle">
              <button 
                onClick={() => {
                  setAddingScheduled(true);
                  setShowingRecurring(false);
                }}
                className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-lg uppercase tracking-wider text-xs"
              >
                {t("addScheduled")}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function AccountForm({ currency, onDone }: { currency: CurrencyCode; onDone: () => void }) {
  const { t } = useI18n();
  const mutation = useMutation({
    mutationFn: (data: { name: string; type: AccountType; initial_balance: number; currency: CurrencyCode }) => apiClient.createAccount(data),
    onSuccess: onDone
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      name: String(data.get("name")),
      type: data.get("type") as AccountType,
      initial_balance: fromMajorUnits(Number(data.get("balance")), currency),
      currency
    });
    event.currentTarget.reset();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 border-t border-border-subtle p-4 md:grid-cols-[1fr_140px_120px_auto]">
      <input className="field" name="name" placeholder={t("addAccount")} required />
      <select className="field" name="type">{accountTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select>
      <input className="field font-data-mono tabular" type="number" step="0.01" name="balance" placeholder="0.00" required />
      <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded bg-primary px-4 text-on-primary"><Plus size={18} /></button>
      {mutation.error ? <div className="md:col-span-4"><ErrorState error={mutation.error} /></div> : null}
    </form>
  );
}

function AccountEditor({ account, isAdmin, onDelete, onDone }: { account: Account; isAdmin: boolean; onDelete: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: account.name,
    type: account.type,
    initial_balance: account.initial_balance,
    currency: account.currency,
    is_active: String(account.is_active)
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.updateAccount(account.id, {
        name: form.name,
        type: form.type,
        initial_balance: form.initial_balance,
        currency: form.currency,
        is_active: Number(form.is_active)
      }),
    onSuccess: onDone
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      {mutation.error ? <div className="md:col-span-2"><ErrorState error={mutation.error} /></div> : null}
      <label className="space-y-1 md:col-span-2">
        <span className="label">{t("name")}</span>
        <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">{t("type")}</span>
        <select className="field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AccountType })}>
          {accountTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("status")}</span>
        <select className="field" value={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.value })}>
          <option value="1">{t("active")}</option>
          <option value="0">{t("inactive")}</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("initialBalance")}</span>
        <input
          className="field font-data-mono tabular"
          type="number"
          step="0.01"
          value={toMajorUnits(form.initial_balance, form.currency)}
          onChange={(event) => setForm({ ...form, initial_balance: fromMajorUnits(Number(event.target.value), form.currency) })}
          required
        />
      </label>
      <label className="space-y-1">
        <span className="label">{t("currency")}</span>
        <select className="field" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as CurrencyCode })}>
          {supportedCurrencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.label}</option>)}
        </select>
      </label>
      <div className="flex gap-3 justify-end w-full md:col-span-2">
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 md:flex-none min-h-12 rounded border border-danger-crisp text-danger-crisp px-5 py-3 text-label-caps font-bold uppercase hover:bg-red-50 transition-colors"
          >
            {t("delete")}
          </button>
        )}
        <button type="submit" className="flex-1 md:flex-none min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary">{t("save")}</button>
      </div>
    </form>
  );
}

function MemberForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const mutation = useMutation({ mutationFn: apiClient.createMember, onSuccess: onDone });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({ name: String(data.get("name")), email: String(data.get("email")), role: data.get("role") as "admin" | "member" });
    event.currentTarget.reset();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 border-t border-border-subtle p-4 md:grid-cols-[1fr_1fr_120px_auto]">
      <input className="field" name="name" placeholder={t("addMember")} required />
      <input className="field" name="email" type="email" placeholder="name@example.com" required />
      <select className="field" name="role"><option value="member">{t("roleMember")}</option><option value="admin">{t("roleAdmin")}</option></select>
      <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded bg-primary px-4 text-on-primary"><Plus size={18} /></button>
      {mutation.error ? <div className="md:col-span-4"><ErrorState error={mutation.error} /></div> : null}
    </form>
  );
}

function MemberEditor({ member, currentUser, isAdmin, onDelete, onDone }: { member: Member; currentUser: Member | null | undefined; isAdmin: boolean; onDelete: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: member.name,
    email: member.email,
    role: member.role,
    is_active: String(member.is_active)
  });
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.updateMember(member.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        is_active: Number(form.is_active)
      }),
    onSuccess: onDone
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      {mutation.error ? <div className="md:col-span-2"><ErrorState error={mutation.error} /></div> : null}
      <label className="space-y-1">
        <span className="label">{t("name")}</span>
        <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">{t("email")}</span>
        <input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">{t("role")}</span>
        <select className="field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "admin" | "member" })}>
          <option value="member">{t("roleMember")}</option>
          <option value="admin">{t("roleAdmin")}</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("status")}</span>
        <select className="field" value={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.value })}>
          <option value="1">{t("active")}</option>
          <option value="0">{t("inactive")}</option>
        </select>
      </label>
      <div className="flex gap-3 justify-end w-full md:col-span-2">
        {isAdmin && member.id !== currentUser?.id && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 md:flex-none min-h-12 rounded border border-danger-crisp text-danger-crisp px-5 py-3 text-label-caps font-bold uppercase hover:bg-red-50 transition-colors"
          >
            {t("delete")}
          </button>
        )}
        <button type="submit" className="flex-1 md:flex-none min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary">{t("save")}</button>
      </div>
    </form>
  );
}

function ScheduledForm({
  scheduled = null,
  currency,
  accounts,
  members,
  categories,
  onDone
}: {
  scheduled?: ScheduledTransaction | null;
  currency: CurrencyCode;
  accounts: Account[];
  members: Member[];
  categories: Category[];
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const [nextRunDate, setNextRunDate] = useState(scheduled?.next_run_date ?? "");
  const [type, setType] = useState<TransactionType>(scheduled?.type ?? "expense");
  const [localAmount, setLocalAmount] = useState<string>(scheduled ? String(toMajorUnits(scheduled.amount, scheduled.currency)) : "");

  // Separate parent and child categories
  const expenseCategories = categories.filter((cat) => cat.type === "expense" && cat.parent_id);
  const incomeCategories = categories.filter((cat) => cat.type === "income" && cat.parent_id);
  const parentExpenseCategories = categories.filter((cat) => cat.type === "expense" && !cat.parent_id);
  const parentIncomeCategories = categories.filter((cat) => cat.type === "income" && !cat.parent_id);

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
    }
  }

  const mutation = useMutation({
    mutationFn: (payload: Omit<ScheduledTransaction, "id" | "created_at">) =>
      scheduled ? apiClient.updateScheduled(scheduled.id, payload) : apiClient.createScheduled(payload),
    onSuccess: onDone
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate({
      account_id: String(data.get("account_id")),
      destination_account_id: type === "transfer" ? String(data.get("destination_account_id")) : null,
      member_id: String(data.get("member_id")),
      category_id: type === "expense" || type === "income" ? String(data.get("category_id")) : null,
      amount: fromMajorUnits(Number(localAmount), currency),
      currency,
      type,
      frequency: data.get("frequency") as ScheduledFrequency,
      interval_day: Number(data.get("interval_day")),
      description: String(data.get("description") || ""),
      is_active: Number(data.get("is_active") ?? 1),
      next_run_date: String(data.get("next_run_date"))
    });
    if (!scheduled) {
      event.currentTarget.reset();
      setType("expense");
      setNextRunDate("");
      setLocalAmount("");
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      {mutation.error ? <div className="md:col-span-2"><ErrorState error={mutation.error} /></div> : null}
      <label className="space-y-1 md:col-span-2">
        <span className="label">{t("description")}</span>
        <input className="field" name="description" defaultValue={scheduled?.description ?? ""} required />
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
        <span className="label">{t("type")}</span>
        <select className="field" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
          {transactionTypes.map((txType) => (
            <option key={txType} value={txType}>{t(txType)}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("account")}</span>
        <select className="field" name="account_id" defaultValue={scheduled?.account_id}>
          {accounts.map((account) => <option key={account.id} value={account.id}>{displayText(account.name, locale)}</option>)}
        </select>
      </label>
      {type === "transfer" && (
        <label className="space-y-1">
          <span className="label">{t("destination")}</span>
          <select className="field" name="destination_account_id" defaultValue={scheduled?.destination_account_id ?? ""}>
            <option value="">{t("selectAccount")}</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{displayText(account.name, locale)}</option>)}
          </select>
        </label>
      )}
      <label className="space-y-1">
        <span className="label">{t("member")}</span>
        <select className="field" name="member_id" defaultValue={scheduled?.member_id}>
          {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </label>
      {(type === "expense" || type === "income") && (
        <label className="space-y-1">
          <span className="label">{t("category")}</span>
          <select className="field" name="category_id" defaultValue={scheduled?.category_id ?? ""}>
            <option value="">{t("selectCategory")}</option>
            {type === "expense" ? (
              parentExpenseCategories.map((parent) => {
                const children = expenseCategories.filter((child) => child.parent_id === parent.id);
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
              })
            ) : (
              parentIncomeCategories.map((parent) => {
                const children = incomeCategories.filter((child) => child.parent_id === parent.id);
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
              })
            )}
          </select>
        </label>
      )}
      <label className="space-y-1">
        <span className="label">{t("frequency")}</span>
        <select className="field" name="frequency" defaultValue={scheduled?.frequency ?? "monthly"}>
          {frequencies.map((frequency) => <option key={frequency} value={frequency}>{t(frequency)}</option>)}
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("intervalDay")}</span>
        <input className="field font-data-mono tabular" type="number" name="interval_day" min="1" max="31" defaultValue={scheduled?.interval_day ?? 1} title={t("intervalDayHint")} required />
      </label>
      <label className="space-y-1">
        <span className="label">{t("nextRunDate")}</span>
        <LocalizedDateInput
          className="field font-data-mono tabular"
          value={nextRunDate}
          onChange={setNextRunDate}
          locale={locale}
        />
        <input type="hidden" name="next_run_date" value={nextRunDate} />
      </label>
      {scheduled ? (
        <label className="space-y-1">
          <span className="label">{t("status")}</span>
          <select className="field" name="is_active" defaultValue={scheduled.is_active}>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="is_active" value="1" />
      )}
      <div className="flex justify-end md:col-span-2">
        <button type="submit" className="min-h-12 rounded bg-primary px-5 py-3 text-label-caps font-bold uppercase text-on-primary">{t("save")}</button>
      </div>
    </form>
  );
}
