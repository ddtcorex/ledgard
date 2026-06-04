import type { CurrencyCode, LocaleCode } from "../types/domain";
import { toIntlLocale, zeroDecimalCurrencies } from "../constants/currencies";

export function formatMoney(amount: number, currency: CurrencyCode, locale: LocaleCode): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: zeroDecimalCurrencies.has(currency) ? 0 : 2,
    minimumFractionDigits: zeroDecimalCurrencies.has(currency) ? 0 : 2
  }).format(toMajorUnits(amount, currency));
}

export function toMajorUnits(amount: number, currency: CurrencyCode): number {
  return zeroDecimalCurrencies.has(currency) ? amount : amount / 100;
}

export function fromMajorUnits(amount: number, currency: CurrencyCode): number {
  return zeroDecimalCurrencies.has(currency) ? Math.round(amount) : Math.round(amount * 100);
}

export function signedAmountLabel(amount: number, sign: "positive" | "negative" | "neutral", currency: CurrencyCode, locale: LocaleCode): string {
  const prefix = sign === "positive" ? "+" : sign === "negative" ? "-" : "";
  return `${prefix}${formatMoney(Math.abs(amount), currency, locale)}`;
}
