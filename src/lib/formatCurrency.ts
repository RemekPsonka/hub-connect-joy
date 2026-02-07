/**
 * Format a numeric amount as a currency string using Intl.NumberFormat.
 * Returns em-dash for null/undefined values.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "PLN",
): string {
  if (amount == null) return "—";

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount in compact form: 1.5M PLN, 50K PLN, 500 PLN.
 * Returns em-dash for null/undefined values.
 */
export function formatCompactCurrency(
  amount: number | null | undefined,
  currency: string = "PLN",
): string {
  if (amount == null) return "—";

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted =
      millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${formatted}M ${currency}`;
  }

  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    const formatted =
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K ${currency}`;
  }

  return `${amount} ${currency}`;
}
