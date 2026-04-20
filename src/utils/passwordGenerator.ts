import type { PasswordOptions } from "../types/common";

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
} as const;

/**
 * Generate a password using cryptographically secure random values.
 * Guarantees at least one character from each enabled character type.
 */
export function generatePasswordString(options: PasswordOptions): string {
  const enabledSets: string[] = [];
  if (options.uppercase) enabledSets.push(CHAR_SETS.uppercase);
  if (options.lowercase) enabledSets.push(CHAR_SETS.lowercase);
  if (options.digits) enabledSets.push(CHAR_SETS.digits);
  if (options.symbols) enabledSets.push(CHAR_SETS.symbols);

  if (enabledSets.length === 0) {
    // Fallback: at least use lowercase
    enabledSets.push(CHAR_SETS.lowercase);
  }

  const allChars = enabledSets.join("");

  // Generate all random indices at once for efficiency
  const randomValues = new Uint32Array(options.length);
  crypto.getRandomValues(randomValues);

  const chars: string[] = [];

  // Ensure at least one char from each enabled set
  for (let i = 0; i < enabledSets.length && i < options.length; i++) {
    const set = enabledSets[i];
    const idx = randomValues[i] % set.length;
    chars.push(set[idx]);
  }

  // Fill remaining positions from the combined set
  for (let i = enabledSets.length; i < options.length; i++) {
    const idx = randomValues[i] % allChars.length;
    chars.push(allChars[idx]);
  }

  // Shuffle to avoid predictable positions of guaranteed chars
  const shuffleValues = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffleValues);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleValues[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
