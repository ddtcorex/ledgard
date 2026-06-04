import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, Home, ListPlus, Plus, ReceiptText, Settings } from "lucide-react";
import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { apiClient } from "../api/client";
import { useI18n } from "../i18n/I18nProvider";
import { useTransactionModal } from "./TransactionModal";

const navItems = [
  { to: "/", labelKey: "overview", icon: Home },
  { to: "/ledger", labelKey: "ledger", icon: ReceiptText },
  { to: "/budgets", labelKey: "budgets", icon: BarChart3 },
  { to: "/reports", labelKey: "reports", icon: FileText },
  { to: "/settings", labelKey: "settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const location = useLocation();
  const { openNew } = useTransactionModal();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });

  // Hide global FAB on pages that have their own FAB
  const showGlobalFAB = !location.pathname.startsWith("/ledger") && !location.pathname.startsWith("/budgets");

  useEffect(() => {
    if (settingsQuery.data?.default_locale && settingsQuery.data.default_locale !== locale) {
      setLocale(settingsQuery.data.default_locale);
    }
  }, [locale, setLocale, settingsQuery.data?.default_locale]);

  return (
    <div className="min-h-screen bg-surface-muted text-on-surface">
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[260px] flex-col border-r border-border-subtle bg-surface-container-low p-4 md:flex">
        <div className="mb-4">
          <h1 className="text-headline-md font-bold text-primary">{t("appName")}</h1>
          <p className="label mt-1">{t("singleLedger")}</p>
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          className="mb-4 flex min-h-12 items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-label-caps font-bold uppercase text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus size={18} />
          {t("quickAdd")}
        </button>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded px-3 py-2 text-body-md transition-colors ${
                    isActive ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-primary"
                  }`
                }
              >
                <Icon size={20} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="min-h-screen w-full pb-28 pt-0 md:pl-[260px] md:pb-10 md:pt-8">
        <div className="mx-auto w-full max-w-container-max md:px-gutter">
          {children}
        </div>
      </main>

      {showGlobalFAB && (
        <button
          type="button"
          onClick={() => openNew()}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-lg active:scale-95 transition-transform md:hidden hover:bg-secondary/90"
          aria-label={t("quickAdd")}
        >
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        </button>
      )}

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-1.5 pb-safe md:hidden bg-surface border-t border-border-subtle bg-surface/90 backdrop-blur-md">
        {navItems.map((item) => {
          const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          
          let iconName = "home";
          if (item.to === "/ledger") iconName = "list_alt";
          else if (item.to === "/budgets") iconName = "pie_chart";
          else if (item.to === "/reports") iconName = "assessment";
          else if (item.to === "/settings") iconName = "settings";

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center p-1.5 active:bg-surface-container-high active:scale-95 duration-100 min-w-[56px] rounded-xl ${
                active 
                  ? "text-primary font-bold bg-primary-fixed/20" 
                  : "text-on-surface-variant"
              }`}
            >
              <span 
                className="material-symbols-outlined text-[20px]" 
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {iconName}
              </span>
              <span className="text-[10px] font-bold mt-0.5">
                {item.to === "/" ? "Home" : t(item.labelKey)}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
