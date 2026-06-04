import { Download } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../../shared/i18n/I18nProvider";

interface ExportPanelProps {
  from: string;
  to: string;
}

export function ExportPanel({ from, to }: ExportPanelProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<"csv" | "excel">("csv");
  const [type, setType] = useState<"transactions" | "categories" | "members">("transactions");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = `/api/reports/export?from=${from}&to=${to}&format=${format}&type=${type}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `ledgard-${type}-${from}-${to}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="surface-card p-3">
      <h3 className="text-body-lg font-bold text-primary mb-3">{t("exportData")}</h3>

      <div className="space-y-4">
        {/* Format Selector */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-2">{t("exportFormat")}</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === "csv"}
                onChange={(e) => setFormat(e.target.value as "csv")}
                className="w-4 h-4"
              />
              <span className="text-sm">{t("csvFormat")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="excel"
                checked={format === "excel"}
                onChange={(e) => setFormat(e.target.value as "excel")}
                className="w-4 h-4"
              />
              <span className="text-sm">{t("excelFormat")}</span>
            </label>
          </div>
        </div>

        {/* Type Selector */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-2">{t("exportType")}</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="transactions"
                checked={type === "transactions"}
                onChange={(e) => setType(e.target.value as "transactions")}
                className="w-4 h-4"
              />
              <span className="text-sm">{t("exportTransactions")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="categories"
                checked={type === "categories"}
                onChange={(e) => setType(e.target.value as "categories")}
                className="w-4 h-4"
              />
              <span className="text-sm">{t("exportCategories")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                value="members"
                checked={type === "members"}
                onChange={(e) => setType(e.target.value as "members")}
                className="w-4 h-4"
              />
              <span className="text-sm">{t("exportMembers")}</span>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-label-caps font-bold uppercase text-on-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          {isExporting ? t("downloading") : t("exportButton")}
        </button>

        <p className="text-xs text-on-surface-variant">
          {t("period")}: {from} → {to}
        </p>
      </div>
    </div>
  );
}
