import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppShell } from "../shared/components/AppShell";
import { AppRoutes } from "./routes";

export function App() {
  const [isAuthPopup, setIsAuthPopup] = useState(false);

  useEffect(() => {
    // Check if this window was opened as a login popup
    if (window.opener && window.name === "ledgard-auth") {
      setIsAuthPopup(true);
      window.opener.postMessage("ledgard-auth-success", "*");
      window.close();
    }
  }, []);

  if (isAuthPopup) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <p className="text-body-md text-on-surface-variant">Authenticating...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
}
