import { Route, Routes } from "react-router-dom";
import { BudgetsPage } from "../features/budgets/BudgetsPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { LedgerPage } from "../features/ledger/LedgerPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/ledger" element={<LedgerPage />} />
      <Route path="/budgets" element={<BudgetsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
