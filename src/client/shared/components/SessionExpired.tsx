import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";

/**
 * Module-level trigger function.
 * Registered by SessionExpiredProvider on mount, callable from fetchApi
 * without needing React context.
 */
let _triggerSessionExpired: (() => void) | null = null;

export function notifySessionExpired() {
  _triggerSessionExpired?.();
}

interface SessionExpiredContextValue {
  triggerSessionExpired: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextValue>({
  triggerSessionExpired: () => {}
});

export function useSessionExpired() {
  return useContext(SessionExpiredContext);
}

/**
 * Detect if the app is running in Standalone mode (added to Home Screen on iOS/Android)
 */
function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Shows a modal when the Cloudflare Access session has expired.
 * Uses a ref-based flag to prevent multiple simultaneous modals.
 *
 * For standard browsers: navigates directly to "/" to trigger CF Access.
 * For PWA Standalone: opens a popup to login, keeping the user in the PWA sandbox.
 */
export function SessionExpiredProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const isShowing = useRef(false);

  const triggerSessionExpired = useCallback(() => {
    if (isShowing.current) return;
    isShowing.current = true;
    setIsVisible(true);
  }, []);

  // Register the module-level trigger on mount
  useEffect(() => {
    _triggerSessionExpired = triggerSessionExpired;
    return () => {
      _triggerSessionExpired = null;
    };
  }, [triggerSessionExpired]);

  // Listen for login success messages from the popup window (for PWA)
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data === "ledgard-auth-success") {
        setIsVisible(false);
        isShowing.current = false;
        // Reload page to refresh all states and React Query cache
        window.location.reload();
      }
    };

    window.addEventListener("message", handleAuthMessage);
    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, []);

  const handleReLogin = useCallback(() => {
    if (isStandaloneMode()) {
      // In PWA standalone mode: open a popup for login to keep session cookie inside PWA sandbox
      const width = 500;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        "/",
        "ledgard-auth",
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!popup) {
        // Fallback if popup blocker blocks it
        window.location.href = "/";
      }
    } else {
      // Standard browser: Navigate to the app root — CF Access will redirect to its login page
      window.location.href = "/";
    }
  }, []);

  return (
    <SessionExpiredContext.Provider value={{ triggerSessionExpired }}>
      {children}
      {isVisible && <SessionExpiredModal onReLogin={handleReLogin} />}
    </SessionExpiredContext.Provider>
  );
}

function SessionExpiredModal({ onReLogin }: { onReLogin: () => void }) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-surface rounded-lg shadow-lg max-w-sm w-full p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning-orange/10">
            <AlertTriangle size={22} className="text-warning-orange" />
          </div>
          <h2 className="text-headline-md font-bold text-on-surface">
            {t("sessionExpiredTitle")}
          </h2>
        </div>
        <p className="text-body-md text-on-surface-variant mb-6">
          {t("sessionExpiredMessage")}
        </p>
        <div className="flex justify-end">
          <button
            onClick={onReLogin}
            className="min-h-10 px-6 py-2 rounded text-label-caps font-bold uppercase bg-primary text-on-primary hover:bg-primary-hover"
          >
            {t("reLogin")}
          </button>
        </div>
      </div>
    </div>
  );
}
