export type LicenseTierId = 'basic' | 'premium' | 'exclusive';

export type LicenseTierOption = {
    id: LicenseTierId;
    title: string;
    price: number;
    summary: string;
    badge?: string;
};

const PREMIUM_MULTIPLIER = 2.5;
const EXCLUSIVE_MULTIPLIER = 7;

export function normalizeLicensePrice(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.round(amount * 100) / 100;
}

export function getLicenseTierPrice(basePriceUsd: number, tierId: LicenseTierId): number {
    const basePrice = normalizeLicensePrice(basePriceUsd);

    if (tierId === 'premium') {
        return normalizeLicensePrice(basePrice * PREMIUM_MULTIPLIER);
    }

    if (tierId === 'exclusive') {
        return normalizeLicensePrice(basePrice * EXCLUSIVE_MULTIPLIER);
    }

    return basePrice;
}

export function buildLicenseTierOptions(basePriceUsd: number): LicenseTierOption[] {
    return [
        {
            id: 'basic',
            title: 'Basic',
            price: getLicenseTierPrice(basePriceUsd, 'basic'),
            summary: 'Best for demos, socials, and early song testing.',
        },
        {
            id: 'premium',
            title: 'Premium',
            price: getLicenseTierPrice(basePriceUsd, 'premium'),
            summary: 'Built for monetized releases, videos, and campaign rollout.',
            badge: 'Most popular',
        },
        {
            id: 'exclusive',
            title: 'Exclusive',
            price: getLicenseTierPrice(basePriceUsd, 'exclusive'),
            summary: 'Highest-value tier for buyers who need the broadest release path.',
        },
    ];
}

export function buildLicenseCartItemId(listingId: string, tierId: LicenseTierId): string {
    if (tierId === 'basic') {
        return listingId;
    }

    return `${listingId}_${tierId}`;
}
