import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";
import { I18nProvider, useI18n } from "../shared/i18n/I18nProvider";
import { apiClient } from "../shared/api/client";
import type { Member } from "../../shared/types/domain";
import { TransactionModalProvider } from "../shared/components/TransactionModal";

interface UserContextValue {
  currentUser: Member | null;
  avatarUrl: string;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  avatarUrl: ""
});

export function useCurrentUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const meQuery = useQuery({ queryKey: ["me"], queryFn: apiClient.me });
  const currentUser = meQuery.data ?? null;
  const avatarUrl = currentUser?.avatar_url || "";

  return (
    <UserContext.Provider value={{ currentUser, avatarUrl }}>
      {children}
    </UserContext.Provider>
  );
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({
  options,
  onConfirm,
  onCancel
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-surface rounded-lg shadow-lg max-w-sm w-full p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {options.title && (
          <h2 className="text-headline-md font-bold text-primary mb-3">{options.title}</h2>
        )}
        <p className="text-body-md text-on-surface mb-6">{options.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="min-h-10 px-4 py-2 rounded text-label-caps font-bold uppercase text-on-surface hover:bg-surface-container"
          >
            {options.cancelText || t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`min-h-10 px-4 py-2 rounded text-label-caps font-bold uppercase ${
              options.danger
                ? "bg-danger-crisp text-white hover:bg-danger-crisp/90"
                : "bg-primary text-on-primary hover:bg-primary-hover"
            }`}
          >
            {options.confirmText || t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  };

  const handleConfirm = () => {
    confirmState?.resolve(true);
    setConfirmState(null);
  };

  const handleCancel = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <I18nProvider>
          <ConfirmProvider>
            <TransactionModalProvider>
              {children}
            </TransactionModalProvider>
          </ConfirmProvider>
        </I18nProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
