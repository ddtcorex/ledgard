import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { apiClient } from "../../../shared/api/client";
import { formatMoney } from "../../../../shared/finance/money";
import { displayText } from "../../../shared/i18n/display";
import { useI18n } from "../../../shared/i18n/I18nProvider";

interface MemberReportProps {
  from: string;
  to: string;
}

export function MemberReport({ from, to }: MemberReportProps) {
  const { t, locale } = useI18n();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["member-report", from, to],
    queryFn: () => apiClient.memberReport(from, to)
  });

  if (isLoading) {
    return (
      <div className="surface-card p-3">
        <p className="text-body-sm text-on-surface-variant">{t("loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-card p-3">
        <p className="text-body-sm text-error">{t("unableToLoadData")}</p>
      </div>
    );
  }

  return (
    <div className="surface-card p-3">
      <h3 className="text-body-lg font-bold text-primary mb-3">{t("memberSpending")}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="text-left py-2 px-2 text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("member")}</th>
              <th className="text-right py-2 px-2 text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("amount")}</th>
              <th className="text-right py-2 px-2 text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">{t("percentage")}</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((member) => {
              const isExpanded = expandedMemberId === member.member_id;
              return (
                <>
                  <tr
                    key={member.member_id}
                    className="border-b border-border-subtle hover:bg-surface-container cursor-pointer"
                    onClick={() => setExpandedMemberId(isExpanded ? null : member.member_id)}
                  >
                    <td className="py-2 px-2 text-sm font-semibold">{member.name}</td>
                    <td className="py-2 px-2 text-sm text-right font-data-mono">
                      {formatMoney(member.total, "VND", locale)}
                    </td>
                    <td className="py-2 px-2 text-sm text-right font-data-mono text-on-surface-variant">
                      {member.percentage.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2">
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-on-surface-variant" />
                      ) : (
                        <ChevronRight size={14} className="text-on-surface-variant" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={4} className="bg-surface-container-low p-3">
                        <p className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-2">{t("categoryBreakdown")}</p>
                        <div className="space-y-1.5">
                          {member.categories.map((cat) => (
                            <div key={cat.category_id} className="flex justify-between items-center py-0.5">
                              <span className="text-xs">{displayText(cat.category_name, locale)}</span>
                              <span className="text-xs font-data-mono text-on-surface-variant">
                                {formatMoney(cat.amount, "VND", locale)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
