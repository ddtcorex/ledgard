import { describe, expect, it } from "vitest";
import { removeDiacritics, generateVietnameseVariations, getVietnameseTranslation, matchesSearch, viTranslations } from "../../src/shared/i18n/translations";
import { displayText } from "../../src/client/shared/i18n/display";

describe("i18n translations", () => {
  describe("removeDiacritics", () => {
    it("removes Vietnamese tone marks", () => {
      expect(removeDiacritics("ăn sáng")).toBe("an sang");
      expect(removeDiacritics("cà phê")).toBe("ca phe");
      expect(removeDiacritics("đồ uống")).toBe("do uong");
    });

    it("handles uppercase Vietnamese characters", () => {
      expect(removeDiacritics("Ăn Sáng")).toBe("An Sang");
      expect(removeDiacritics("Đồ Ăn")).toBe("Do An");
    });

    it("preserves non-Vietnamese text", () => {
      expect(removeDiacritics("Hello World")).toBe("Hello World");
      expect(removeDiacritics("123 ABC")).toBe("123 ABC");
    });

    it("handles mixed Vietnamese and English", () => {
      expect(removeDiacritics("Breakfast ăn sáng")).toBe("Breakfast an sang");
    });

    it("handles empty string", () => {
      expect(removeDiacritics("")).toBe("");
    });
  });

  describe("generateVietnameseVariations", () => {
    it("generates character variations for Vietnamese search", () => {
      const variations = generateVietnameseVariations("an sang");
      expect(variations).toContain("an sang");
      expect(variations.length).toBeGreaterThan(1);
      expect(variations.length).toBeLessThanOrEqual(15); // Hard limit
    });

    it("generates variations for single replaceable character", () => {
      const variations = generateVietnameseVariations("an");
      expect(variations).toContain("an");
      expect(variations.some(v => v.includes("ă"))).toBe(true);
    });

    it("limits variations to 15 to avoid SQL errors", () => {
      const variations = generateVietnameseVariations("aaa eee ooo");
      expect(variations.length).toBeLessThanOrEqual(15);
    });

    it("handles text without replaceable characters", () => {
      const variations = generateVietnameseVariations("xyz");
      expect(variations).toEqual(["xyz"]);
    });

    it("handles empty string", () => {
      const variations = generateVietnameseVariations("");
      expect(variations).toEqual([""]);
    });
  });

  describe("getVietnameseTranslation", () => {
    it("returns Vietnamese translation for known English text", () => {
      expect(getVietnameseTranslation("Breakfast")).toBe("Ăn sáng");
      expect(getVietnameseTranslation("Coffee")).toBe("Cà phê");
      expect(getVietnameseTranslation("Salary")).toBe("Lương");
    });

    it("returns original text when no translation exists", () => {
      expect(getVietnameseTranslation("Unknown Term")).toBe("Unknown Term");
      expect(getVietnameseTranslation("XYZ")).toBe("XYZ");
    });

    it("handles case-sensitive lookups", () => {
      expect(getVietnameseTranslation("breakfast")).toBe("ăn sáng");
      expect(getVietnameseTranslation("Breakfast")).toBe("Ăn sáng");
    });

    it("handles empty string", () => {
      expect(getVietnameseTranslation("")).toBe("");
    });
  });

  describe("matchesSearch", () => {
    it("matches English text case-insensitively", () => {
      expect(matchesSearch("Breakfast", "break")).toBe(true);
      expect(matchesSearch("Breakfast", "BREAK")).toBe(true);
      expect(matchesSearch("Breakfast", "fast")).toBe(true);
    });

    it("matches Vietnamese translation case-insensitively", () => {
      expect(matchesSearch("Breakfast", "ăn")).toBe(true);
      expect(matchesSearch("Breakfast", "sáng")).toBe(true);
      expect(matchesSearch("Coffee", "cà phê")).toBe(true);
    });

    it("matches Vietnamese translation without diacritics", () => {
      expect(matchesSearch("Breakfast", "an sang")).toBe(true);
      expect(matchesSearch("Coffee", "ca phe")).toBe(true);
    });

    it("returns false for non-matching search", () => {
      expect(matchesSearch("Breakfast", "dinner")).toBe(false);
      expect(matchesSearch("Coffee", "tea")).toBe(false);
    });

    it("handles null and undefined values", () => {
      expect(matchesSearch(null, "test")).toBe(false);
      expect(matchesSearch(undefined, "test")).toBe(false);
      expect(matchesSearch("Breakfast", "")).toBe(false);
    });

    it("handles empty search term", () => {
      expect(matchesSearch("Breakfast", "")).toBe(false);
    });
  });

  describe("viTranslations dictionary", () => {
    it("contains account translations", () => {
      expect(viTranslations["Cash Wallet"]).toBe("Ví tiền mặt");
      expect(viTranslations["Joint Checking"]).toBe("Tài khoản thanh toán chung");
    });

    it("contains category translations", () => {
      expect(viTranslations["Income"]).toBe("Thu nhập");
      expect(viTranslations["Salary"]).toBe("Lương");
      expect(viTranslations["Groceries"]).toBe("Đi chợ");
    });

    it("contains food term translations", () => {
      expect(viTranslations["breakfast"]).toBe("ăn sáng");
      expect(viTranslations["lunch"]).toBe("ăn trưa");
      expect(viTranslations["dinner"]).toBe("ăn tối");
    });

    it("contains both capitalized and lowercase variants", () => {
      expect(viTranslations["Breakfast"]).toBe("Ăn sáng");
      expect(viTranslations["breakfast"]).toBe("ăn sáng");
    });
  });
});

describe("i18n display utilities", () => {
  describe("displayText", () => {
    it("returns Vietnamese translation when locale is vi", () => {
      expect(displayText("Breakfast", "vi")).toBe("Ăn sáng");
      expect(displayText("Coffee", "vi")).toBe("Cà phê");
      expect(displayText("Salary", "vi")).toBe("Lương");
    });

    it("returns original English text when locale is en", () => {
      expect(displayText("Breakfast", "en")).toBe("Breakfast");
      expect(displayText("Coffee", "en")).toBe("Coffee");
      expect(displayText("Salary", "en")).toBe("Salary");
    });

    it("returns original text when no Vietnamese translation exists", () => {
      expect(displayText("Unknown Term", "vi")).toBe("Unknown Term");
      expect(displayText("XYZ", "vi")).toBe("XYZ");
    });

    it("handles null and undefined values", () => {
      expect(displayText(null, "en")).toBe("");
      expect(displayText(undefined, "en")).toBe("");
      expect(displayText(null, "vi")).toBe("");
      expect(displayText(undefined, "vi")).toBe("");
    });

    it("handles empty string", () => {
      expect(displayText("", "en")).toBe("");
      expect(displayText("", "vi")).toBe("");
    });
  });
});

describe("i18n fallback mechanism", () => {
  // These tests simulate the behavior of the t() function in I18nProvider
  // The actual t() function has this fallback chain: dictionaries[locale][key] ?? dictionaries.en[key] ?? key

  it("should fall back from vi to en when key is missing in vi", () => {
    // Simulating the fallback logic
    const dictionaries = {
      en: { greeting: "Hello", farewell: "Goodbye" },
      vi: { greeting: "Xin chào" } // missing 'farewell'
    };

    const locale = "vi";
    const key = "farewell";
    const result = (dictionaries as any)[locale][key] ?? (dictionaries as any).en[key] ?? key;

    expect(result).toBe("Goodbye"); // Falls back to English
  });

  it("should return key itself when missing in both locales", () => {
    const dictionaries = {
      en: { greeting: "Hello" },
      vi: { greeting: "Xin chào" }
    };

    const locale = "vi";
    const key = "unknownKey";
    const result = (dictionaries as any)[locale][key] ?? (dictionaries as any).en[key] ?? key;

    expect(result).toBe("unknownKey"); // Falls back to key
  });

  it("should use locale translation when available", () => {
    const dictionaries = {
      en: { greeting: "Hello" },
      vi: { greeting: "Xin chào" }
    };

    const locale = "vi";
    const key = "greeting";
    const result = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;

    expect(result).toBe("Xin chào"); // Uses Vietnamese
  });

  it("should handle parameter interpolation", () => {
    let text = "Còn lại {{count}} ngày";
    const params = { count: 5 };

    Object.keys(params).forEach((paramKey) => {
      text = text.replace(`{{${paramKey}}}`, String((params as any)[paramKey]));
    });

    expect(text).toBe("Còn lại 5 ngày");
  });

  it("should handle multiple parameter interpolation", () => {
    let text = "{{name}} has {{count}} items";
    const params = { name: "John", count: 10 };

    Object.keys(params).forEach((paramKey) => {
      text = text.replace(`{{${paramKey}}}`, String((params as any)[paramKey]));
    });

    expect(text).toBe("John has 10 items");
  });

  it("should handle missing parameters gracefully", () => {
    let text = "Hello {{name}}";
    const params = {};

    Object.keys(params).forEach((paramKey) => {
      text = text.replace(`{{${paramKey}}}`, String((params as any)[paramKey]));
    });

    expect(text).toBe("Hello {{name}}"); // Placeholder remains
  });
});
