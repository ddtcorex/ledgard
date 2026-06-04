import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Play } from "lucide-react";
import type { BudgetView, CurrencyCode } from "../../../../shared/types/domain";
import { apiClient } from "../../../shared/api/client";
import { ErrorState, LoadingState, Modal } from "../../../shared/components/ui";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { useBudgetTemplates, useApplyBudgetTemplate, useDeleteBudgetTemplate } from "../hooks/useBudgets";
import { BudgetTemplateForm } from "./BudgetTemplateForm";

export function BudgetTemplatesList({
  budgets,
  currency
}: {
  budgets: BudgetView[];
  currency: CurrencyCode;
}) {
  const { t, locale } = useI18n();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: apiClient.me });
  const isCurrentAdmin = meQuery.data?.role === "admin";
  const templatesQuery = useBudgetTemplates();
  const applyMutation = useApplyBudgetTemplate();
  const deleteMutation = useDeleteBudgetTemplate();

  if (meQuery.isLoading || templatesQuery.isLoading) {
    return <LoadingState />;
  }

  if (meQuery.error || templatesQuery.error) {
    return <ErrorState error={meQuery.error || templatesQuery.error!} />;
  }

  const templates = templatesQuery.data ?? [];

  function handleApply(templateId: string, templateName: string) {
    const confirmed = confirm(
      locale === "vi"
        ? `Áp dụng mẫu "${templateName}"? Các ngân sách đã tồn tại sẽ không bị ghi đè.`
        : `Apply template "${templateName}"? Existing budgets will not be overwritten.`
    );
    if (!confirmed) return;

    const targetMonth = prompt(
      locale === "vi" ? "Nhập tháng áp dụng (YYYY-MM):" : "Enter target month (YYYY-MM):",
      new Date().toISOString().slice(0, 7)
    );
    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) return;

    const [year, month] = targetMonth.split("-").map(Number);
    applyMutation.mutate(
      { id: templateId, data: { target_year: year, target_month: month } },
      {
        onSuccess: (result) => {
          const created = result?.created ?? 0;
          alert(
            locale === "vi"
              ? `Đã tạo ${created} ngân sách từ mẫu!`
              : `Created ${created} budgets from template!`
          );
        }
      }
    );
  }

  function handleDelete(templateId: string, templateName: string) {
    const confirmed = confirm(
      locale === "vi"
        ? `Xóa mẫu "${templateName}"?`
        : `Delete template "${templateName}"?`
    );
    if (!confirmed) return;
    deleteMutation.mutate(templateId);
  }

  return (
    <>
      <section className="surface-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle p-4">
          <h2 className="text-headline-md font-bold text-primary">{t("budgetTemplates")}</h2>
          {isCurrentAdmin && budgets.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-label-caps font-bold uppercase text-on-primary"
            >
              <Plus size={16} />
              {t("saveAsTemplate")}
            </button>
          )}
        </div>

        {templates.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">{t("noTemplates")}</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {templates.map((template) => (
              <div key={template.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-on-surface">{template.name}</p>
                      {template.is_shared === 1 && (
                        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
                          {t("shared")}
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="mt-1 text-sm text-on-surface-variant">{template.description}</p>
                    )}
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {new Date(template.created_at).toLocaleDateString(
                        locale === "vi" ? "vi-VN" : "en-US",
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </p>
                  </div>
                  {isCurrentAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApply(template.id, template.name)}
                        className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-on-primary hover:bg-primary/90"
                      >
                        <Play size={12} />
                        {t("apply")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template.id, template.name)}
                        className="inline-flex items-center justify-center rounded-full p-2 text-danger-crisp hover:bg-danger-crisp/10"
                        aria-label={t("delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showCreateForm && (
        <Modal title={t("saveAsTemplate")} onClose={() => setShowCreateForm(false)}>
          <BudgetTemplateForm
            budgets={budgets}
            currency={currency}
            onDone={() => {
              setShowCreateForm(false);
              templatesQuery.refetch();
            }}
          />
        </Modal>
      )}
    </>
  );
}