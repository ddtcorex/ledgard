/**
 * Vietnamese translations for seed data and common terms.
 * Used for display on frontend and search matching on backend.
 */
export const viTranslations: Record<string, string> = {
  // Accounts
  "Cash Wallet": "Ví tiền mặt",
  "Joint Checking": "Tài khoản thanh toán chung",
  "Family Credit Card": "Thẻ tín dụng gia đình",
  "Emergency Savings": "Quỹ dự phòng",

  // Categories
  "Income": "Thu nhập",
  "Salary": "Lương",
  "Bonus": "Thưởng",
  "Housing & Utilities": "Nhà ở & tiện ích",
  "Rent": "Tiền thuê nhà",
  "Electricity": "Điện",
  "Internet": "Internet",
  "Food & Household": "Ăn uống & gia dụng",
  "Groceries": "Đi chợ",
  "Dining Out": "Ăn ngoài",
  "Transport": "Di chuyển",
  "Fuel": "Xăng xe",
  "Rideshare": "Xe công nghệ",
  "Lifestyle": "Đời sống",
  "Entertainment": "Giải trí",
  "Health": "Sức khỏe",

  // Transaction descriptions
  "Monthly salary": "Lương tháng",
  "Weekly groceries": "Đi chợ hằng tuần",
  "Family dinner": "Bữa tối gia đình",
  "Fuel refill": "Đổ xăng",
  "ATM withdrawal": "Rút tiền ATM",
  "Short-term loan to cousin": "Khoản cho vay ngắn hạn",

  // Common food terms
  "Breakfast": "Ăn sáng",
  "breakfast": "ăn sáng",
  "Lunch": "Ăn trưa",
  "lunch": "ăn trưa",
  "Dinner": "Ăn tối",
  "dinner": "ăn tối",
  "Coffee": "Cà phê",
  "coffee": "cà phê",
  "Snack": "Ăn vặt",
  "snack": "ăn vặt",
  "Drink": "Đồ uống",
  "drink": "đồ uống",
  "Food": "Đồ ăn",
  "food": "đồ ăn",
  "Restaurant": "Nhà hàng",
  "restaurant": "nhà hàng",
  "Market": "Chợ",
  "market": "chợ",
  "Supermarket": "Siêu thị",
  "supermarket": "siêu thị"
};

/**
 * Remove Vietnamese diacritics (tone marks) from text.
 * Converts "ăn sáng" to "an sang" for diacritic-insensitive search.
 */
export function removeDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // Remove combining diacritical marks
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/ă/g, "a")
    .replace(/Ă/g, "A")
    .replace(/â/g, "a")
    .replace(/Â/g, "A")
    .replace(/ê/g, "e")
    .replace(/Ê/g, "E")
    .replace(/ô/g, "o")
    .replace(/Ô/g, "O")
    .replace(/ơ/g, "o")
    .replace(/Ơ/g, "O")
    .replace(/ư/g, "u")
    .replace(/Ư/g, "U");
}

/**
 * Generate Vietnamese character variations for a search term.
 * Generates key variations including mixed characters (e.g., "ăn sáng").
 */
export function generateVietnameseVariations(text: string): string[] {
  const variations = new Set<string>([text]);

  // Most common Vietnamese characters for each base character
  const charMap: Record<string, string[]> = {
    'a': ['ă', 'á'],
    'A': ['Ă', 'Á'],
    'e': ['ê', 'é'],
    'E': ['Ê', 'É'],
    'o': ['ô', 'ó'],
    'O': ['Ô', 'Ó'],
    'u': ['ư', 'ú'],
    'U': ['Ư', 'Ú'],
    'd': ['đ'],
    'D': ['Đ']
  };

  const chars = text.split('');
  const positions: number[] = [];

  // Find positions of replaceable characters
  for (let i = 0; i < chars.length; i++) {
    if (charMap[chars[i]]) {
      positions.push(i);
    }
  }

  // Generate variations for first 2 positions only (to keep it manageable)
  const maxPositions = Math.min(positions.length, 2);

  for (let i = 0; i < maxPositions; i++) {
    const pos = positions[i];
    const char = chars[pos];
    const replacements = charMap[char] || [];

    // For each replacement at this position
    for (const replacement of replacements) {
      const newChars = [...chars];
      newChars[pos] = replacement;
      variations.add(newChars.join(''));
    }
  }

  // If we have 2 positions, also generate combinations
  if (maxPositions === 2) {
    const pos1 = positions[0];
    const pos2 = positions[1];
    const replacements1 = charMap[chars[pos1]] || [];
    const replacements2 = charMap[chars[pos2]] || [];

    for (const r1 of replacements1) {
      for (const r2 of replacements2) {
        const newChars = [...chars];
        newChars[pos1] = r1;
        newChars[pos2] = r2;
        const variation = newChars.join('');
        variations.add(variation);
        // Add capitalized version for case-insensitive matching
        if (variation[0]) {
          variations.add(variation[0].toUpperCase() + variation.slice(1));
        }
      }
    }
  }

  // HARD LIMIT: Only return first 15 variations to avoid SQL errors
  return Array.from(variations).slice(0, 15);
}

/**
 * Get Vietnamese translation for a given English text.
 * Returns the original text if no translation exists.
 */
export function getVietnameseTranslation(englishText: string): string {
  return viTranslations[englishText] ?? englishText;
}

/**
 * Check if a search term matches either the English text or its Vietnamese translation.
 * Case-insensitive and diacritic-insensitive matching.
 */
export function matchesSearch(englishText: string | null | undefined, searchTerm: string): boolean {
  if (!englishText || !searchTerm) {
    return false;
  }

  const normalizedSearch = removeDiacritics(searchTerm.toLowerCase());
  const normalizedEnglish = removeDiacritics(englishText.toLowerCase());
  const normalizedVietnamese = removeDiacritics(getVietnameseTranslation(englishText).toLowerCase());

  return normalizedEnglish.includes(normalizedSearch) || normalizedVietnamese.includes(normalizedSearch);
}
