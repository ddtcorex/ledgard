import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import type { Category, CategoryType } from "../../../../shared/types/domain";
import { apiClient } from "../../../shared/api/client";
import { ErrorState } from "../../../shared/components/ui";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { ICON_GROUPS } from "../../../shared/lib/icon-picker";

export function CategoryForm({
  category,
  parent,
  type,
  onDone
}: {
  category: Category | null;
  parent: Category | null;
  type: CategoryType;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({
    name: category?.name ?? "",
    type: category?.type ?? parent?.type ?? type,
    icon: category?.icon ?? "",
    color: category?.color ?? "#006a61",
    is_active: String(category?.is_active ?? 1)
  });
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        icon: form.icon || null,
        color: form.color || null
      };
      return category
        ? apiClient.updateCategory(category.id, { ...payload, is_active: Number(form.is_active) })
        : apiClient.createCategory({ ...payload, type: form.type, parent_id: parent?.id ?? null });
    },
    onSuccess: onDone
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
      {mutation.error ? <div className="md:col-span-2"><ErrorState error={mutation.error} /></div> : null}
      <label className="space-y-1 md:col-span-2">
        <span className="label">{t("name")}</span>
        <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </label>
      <label className="space-y-1">
        <span className="label">{t("type")}</span>
        <select className="field" value={form.type} disabled={Boolean(category || parent)} onChange={(event) => setForm({ ...form, type: event.target.value as CategoryType })}>
          <option value="expense">{t("expense")}</option>
          <option value="income">{t("income")}</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="label">{t("parentCategory")}</span>
        <input className="field" value={parent ? displayText(parent.name, locale) : t("rootCategory")} disabled />
      </label>
      <label className="space-y-1">
        <span className="label">{t("color")}</span>
        <input className="field h-10 p-1" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
      </label>
      <div className="space-y-1">
        <span className="label">{t("icon")}</span>
        <button
          type="button"
          onClick={() => setIconPickerOpen(!iconPickerOpen)}
          className="field flex items-center gap-2 cursor-pointer"
        >
          {form.icon ? (
            <span className="material-symbols-outlined text-[18px]">{form.icon}</span>
          ) : (
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">category</span>
          )}
          <span className={`text-sm ${form.icon ? "text-on-surface" : "text-on-surface-variant"}`}>{form.icon || t("icon")}</span>
        </button>
        {iconPickerOpen && (
          <div className="border border-border-subtle rounded-lg bg-surface-container-lowest shadow-md max-h-48 overflow-y-auto">
            {ICON_GROUPS.map((group) => (
              <div key={group.label} className="px-2.5 py-1.5 border-b border-border-subtle last:border-0">
                <p className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wide mb-1">{t(group.label)}</p>
                <div className="flex flex-wrap gap-0.5">
                  {group.icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => { setForm({ ...form, icon }); setIconPickerOpen(false); }}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                        form.icon === icon
                          ? "bg-primary text-on-primary"
                          : "hover:bg-surface-container-high text-on-surface-variant"
                      }`}
                      title={icon}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {category ? (
        <label className="space-y-1 md:col-span-2">
          <span className="label">{t("status")}</span>
          <select className="field" value={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.value })}>
            <option value="1">{t("active")}</option>
            <option value="0">{t("inactive")}</option>
          </select>
        </label>
      ) : null}
      <div className="flex justify-end md:col-span-2">
        <button type="submit" className="min-h-10 rounded bg-primary px-4 py-2 text-label-caps font-bold uppercase text-on-primary">{t("save")}</button>
      </div>
    </form>
  );
}
