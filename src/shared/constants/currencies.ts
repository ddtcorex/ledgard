import type { CurrencyCode, LocaleCode } from "../types/domain";

export const supportedCurrencies: Array<{ code: CurrencyCode; label: string; locale: LocaleCode | "en-SG" | "en-AU" | "en-CA" | "ja-JP" | "en-GB" | "de-DE" }> = [
  { code: "USD", label: "US Dollar", locale: "en" },
  { code: "VND", label: "Vietnamese Dong", locale: "vi" },
  { code: "EUR", label: "Euro", locale: "de-DE" },
  { code: "GBP", label: "British Pound", locale: "en-GB" },
  { code: "JPY", label: "Japanese Yen", locale: "ja-JP" },
  { code: "SGD", label: "Singapore Dollar", locale: "en-SG" },
  { code: "AUD", label: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", label: "Canadian Dollar", locale: "en-CA" }
];

export const zeroDecimalCurrencies = new Set<CurrencyCode>(["VND", "JPY"]);

export function toIntlLocale(locale: LocaleCode): string {
  return locale === "vi" ? "vi-VN" : "en-US";
}
