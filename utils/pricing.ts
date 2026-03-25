/** FX for Flutterwave (NGN settlement). Keep in sync with `functions/src/index.ts` NAIRA_RATE. */
export const NAIRA_RATE = 1600;

export function ngnToUsd(ngn: number): number {
  return Math.round((ngn / NAIRA_RATE) * 100) / 100;
}

export function usdToNgn(usd: number): number {
  return Math.round(usd * NAIRA_RATE);
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
