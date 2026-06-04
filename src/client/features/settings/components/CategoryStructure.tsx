import { useMutation } from "@tanstack/react-query";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { Category } from "../../../../shared/types/domain";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { getCategoryIcon } from "../../../shared/lib/categories";

export function CategoryStructure({
  categories,
  title,
  onAddRoot,
  onAddChild,
  onEdit,
  onDeleteCategory
}: {
  categories: Category[];
  title: string;
  onAddRoot: () => void;
  onAddChild: (parent: Category) => void;
  onEdit: (category: Category, parent?: Category | null) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const parents = useMemo(() => categories.filter((category) => category.parent_id === null), [categories]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-label-caps font-bold text-primary uppercase tracking-wider">{title}</h2>
        <button type="button" className="icon-button" onClick={onAddRoot} aria-label={t("addCategory")}>
          <Plus size={18} />
        </button>
      </div>
      <div className="space-y-3">
        {parents.map((parent) => (
          <div key={parent.id}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]" style={{ color: parent.color ?? "#003441" }}>
                {getCategoryIcon(parent.icon, parent.type)}
              </span>
              <p className={`text-sm font-medium ${parent.is_active ? "text-on-surface" : "text-on-surface-variant"}`}>{displayText(parent.name, locale)}</p>
              <span className="text-[10px] font-label-caps text-on-surface-variant ml-auto uppercase">{t(parent.type)}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" className="icon-button" onClick={() => onAddChild(parent)} aria-label={t("addChildCategory")}>
                  <Plus size={14} />
                </button>
                <div className="action-group">
                  <button type="button" className="action-group-btn" onClick={() => onEdit(parent, null)} aria-label={t("editCategory")}>
                    <Edit2 size={12} />
                  </button>
                  <div className="action-group-divider" />
                  <button type="button" className="action-group-btn danger" onClick={() => onDeleteCategory(parent.id)} aria-label={t("delete")}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
            <div className="ml-5 mt-1 space-y-0.5 border-l border-border-subtle pl-3">
              {categories.filter((category) => category.parent_id === parent.id).map((child) => (
                <div key={child.id} className="flex min-h-8 items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                      {getCategoryIcon(child.icon, child.type)}
                    </span>
                    <p className={`text-xs ${child.is_active ? "text-on-surface-variant" : "text-on-surface-variant/60"}`}>{displayText(child.name, locale)}</p>
                  </div>
                  <div className="action-group">
                    <button type="button" className="action-group-btn" onClick={() => onEdit(child, parent)} aria-label={t("editCategory")}>
                      <Edit2 size={12} />
                    </button>
                    <div className="action-group-divider" />
                    <button type="button" className="action-group-btn danger" onClick={() => onDeleteCategory(child.id)} aria-label={t("delete")}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
