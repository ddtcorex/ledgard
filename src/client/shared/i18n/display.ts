import type { LocaleCode } from "../../../shared/types/domain";
import { viTranslations } from "../../../shared/i18n/translations";

export function displayText(value: string | null | undefined, locale: LocaleCode): string {
  if (!value) {
    return "";
  }
  return locale === "vi" ? viTranslations[value] ?? value : value;
}
