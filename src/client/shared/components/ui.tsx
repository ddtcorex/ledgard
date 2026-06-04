import { AlertCircle, Loader2, X, Calendar } from "lucide-react";
import type { CurrencyCode, LocaleCode } from "../../../shared/types/domain";
import { formatMoney } from "../../../shared/finance/money";
import { useI18n } from "../i18n/I18nProvider";
import { formatDate } from "../lib/dates";
import { useCurrentUser } from "../../app/providers";

export function Money({ amount, currency, locale, className = "" }: { amount: number; currency: CurrencyCode; locale: LocaleCode; className?: string }) {
  return <span className={`font-data-mono tabular whitespace-nowrap ${className}`}>{formatMoney(amount, currency, locale)}</span>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="surface-card flex min-h-40 items-center justify-center gap-2 text-on-surface-variant">
      <Loader2 className="animate-spin" size={18} />
      <span>{label === "Loading" ? t("loading") : label}</span>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useI18n();
  const message = error instanceof Error ? error.message : t("unableToLoadData");
  return (
    <div className="surface-card flex items-start gap-3 border-danger-crisp/30 bg-danger-crisp/5 p-4 text-danger-crisp">
      <AlertCircle size={20} />
      <p className="text-body-md">{message}</p>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="surface-card p-6 text-center text-on-surface-variant">{label}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  const color = value >= 100 ? "bg-danger-crisp" : value >= 80 ? "bg-warning-orange" : "bg-secondary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-primary/20 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-surface-container-lowest px-3 py-4 shadow-soft md:max-w-2xl md:rounded-lg md:px-6 md:py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-headline-md font-bold text-primary">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("close")}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function LocalizedDateInput({
  value,
  onChange,
  locale,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  locale: string;
  className?: string;
}) {
  const displayValue = formatDate(value, locale);

  return (
    <div className="relative w-full">
      <input
        type="text"
        readOnly
        value={displayValue}
        className={`${className} cursor-pointer select-none pr-10`}
        tabIndex={-1}
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant">
        <Calendar size={18} />
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch (err) {}
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}

export function MobileHeader({ title }: { title: string }) {
  const { avatarUrl } = useCurrentUser();

  return (
    <header className="bg-surface border-b border-border-subtle sticky top-0 z-30 w-full shrink-0">
      <div className="flex items-center justify-between w-full px-3 h-12">
        <span className="text-[20px] font-headline-md font-bold text-primary">
          {title}
        </span>
        {avatarUrl ? (
          <img
            alt="Avatar"
            className="w-7 h-7 rounded-full object-cover border border-border-subtle"
            src={avatarUrl}
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-surface-variant border border-border-subtle flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
          </div>
        )}
      </div>
    </header>
  );
}

