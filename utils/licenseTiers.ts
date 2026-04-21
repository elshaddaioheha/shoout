export type LicenseTierId = 'basic' | 'premium' | 'exclusive';

export type LicenseTierOption = {
    id: LicenseTierId;
    title: string;
    price: number;
    summary: string;
    badge?: string;
};

export function normalizeLicensePrice(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.round(amount * 100) / 100;
}

export function buildLicenseTierOptions(dynamicTiers: LicenseTierOption[] = []): LicenseTierOption[] {
    return dynamicTiers;
}

export function buildLicenseCartItemId(listingId: string, tierId: LicenseTierId): string {
    if (tierId === 'basic') {
        return listingId;
    }

    return `${listingId}_${tierId}`;
}
