/**
 * Formatting utilities - currency conversion, data formatting
 */

import { NAIRA_RATE, VAT_RATE, InvoiceLine } from '../types';

/**
 * Converts USD amount to NGN using current exchange rate and rounds
 */
export function convertUsdToNgn(totalUsd: number): number {
  return Math.round(totalUsd * NAIRA_RATE);
}

/**
 * Converts NGN to USD
 */
export function convertNgnToUsd(totalNgn: number): number {
  return Math.round((totalNgn / NAIRA_RATE) * 100) / 100;
}

/**
 * Rounds USD amounts to 2 decimal places
 */
export function roundUsd(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Formats currency for display with locale-specific formatting
 */
export function formatCurrency(amount: number, locale: string = 'en-NG'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

/**
 * Calculates VAT (7.5%) from subtotal
 */
export function calculateVat(subtotalNgn: number): number {
  return Math.round(subtotalNgn * VAT_RATE);
}

/**
 * Calculates total invoice amount (subtotal + VAT)
 */
export function calculateInvoiceTotal(subtotalNgn: number): number {
  const vat = calculateVat(subtotalNgn);
  return subtotalNgn + vat;
}

/**
 * Parses timestamp from various formats (ms, ISO string, Timestamp object)
 */
export function parseTimestamp(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;

    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) return dateMs;
  }
  if (value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return null;
}

/**
 * Converts milliseconds to ISO date string
 */
export function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Converts ISO date string to milliseconds
 */
export function isoToMs(iso: string): number {
  return Date.parse(iso);
}

/**
 * Formats naira amount as localized string with commas
 */
export function formatNairaAmount(amountNgn: number): string {
  return (Math.round(amountNgn) || 0).toLocaleString('en-NG');
}

/**
 * Formats a subscription plan ID to display name
 */
export function formatPlanName(planId: string): string {
  const names: Record<string, string> = {
    shoout: 'Shoouts',
    vault: 'Vault',
    vault_pro: 'Vault Pro',
    studio: 'Studio',
    hybrid: 'Hybrid',
  };
  return names[planId] || planId;
}

/**
 * Formats billing cycle to display name
 */
export function formatBillingCycle(cycle: string): string {
  return cycle === 'annual' ? 'Annual' : 'Monthly';
}

/**
 * Generates a unique invoice number
 */
export function generateInvoiceNumber(prefix: string = 'INV'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Calculates platform fee (10%) from transaction amount
 */
export function calculatePlatformFee(amountNgn: number): number {
  return Math.round(amountNgn * 0.1);
}

/**
 * Calculates creator payout (amount - platform fee)
 */
export function calculateCreatorPayout(amountNgn: number): number {
  return amountNgn - calculatePlatformFee(amountNgn);
}
