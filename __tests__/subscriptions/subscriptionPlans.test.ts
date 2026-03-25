/**
 * Subscription Plan Tests — USD display prices (NGN settlement × NAIRA_RATE on backend only).
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { ngnToUsd } from '../../utils/pricing';

const PLANS = [
    {
        id: 'vault',
        name: 'Vault',
        monthlyPriceUsd: 0,
        annualPerMonthUsd: 0,
        annualTotalUsd: 0,
        category: 'Vault',
        features: ['Private Folder Sharing'],
    },
    {
        id: 'vault_pro',
        name: 'Vault Pro',
        monthlyPriceUsd: ngnToUsd(13962),
        annualPerMonthUsd: ngnToUsd(13962),
        annualTotalUsd: ngnToUsd(13962 * 12),
        category: 'Vault',
        features: ['Advanced Tracking'],
    },
    {
        id: 'studio',
        name: 'Studio',
        monthlyPriceUsd: ngnToUsd(27000),
        annualPerMonthUsd: ngnToUsd(22950),
        annualTotalUsd: ngnToUsd(22950 * 12),
        category: 'Studio',
        features: ['Unlimited Listings'],
    },
    {
        id: 'hybrid',
        name: 'Hybrid',
        monthlyPriceUsd: ngnToUsd(34906),
        annualPerMonthUsd: ngnToUsd(29670),
        annualTotalUsd: ngnToUsd(29670 * 12),
        category: 'Hybrid',
        features: ['Team Collaboration'],
    },
];

describe('Subscription Plans › data integrity', () => {
    it('contains exactly 4 plans', () => {
        expect(PLANS).toHaveLength(4);
    });

    it('every plan has a unique id', () => {
        const ids = PLANS.map((p) => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(PLANS.length);
    });

    it('every plan has at least one feature', () => {
        PLANS.forEach((plan) => {
            expect(plan.features.length).toBeGreaterThan(0);
        });
    });
});

describe('Subscription Plans › annual pricing policy', () => {
    it('vault remains free', () => {
        const vault = PLANS.find((p) => p.id === 'vault');
        expect(vault?.monthlyPriceUsd).toBe(0);
        expect(vault?.annualTotalUsd).toBe(0);
    });

    it('vault_pro annual has no discount (business exception)', () => {
        const vaultPro = PLANS.find((p) => p.id === 'vault_pro');
        expect(vaultPro?.annualPerMonthUsd).toBe(vaultPro?.monthlyPriceUsd);
    });

    it('studio annual per-month is exactly 15% off monthly (in NGN terms)', () => {
        const studio = PLANS.find((p) => p.id === 'studio');
        const expectedAnnualNgn = Math.round(27000 * 0.85);
        expect(ngnToUsd(expectedAnnualNgn)).toBe(studio!.annualPerMonthUsd);
    });

    it('hybrid annual per-month is exactly 15% off monthly (in NGN terms)', () => {
        const hybrid = PLANS.find((p) => p.id === 'hybrid');
        const expectedAnnualNgn = Math.round(34906 * 0.85);
        expect(ngnToUsd(expectedAnnualNgn)).toBe(hybrid!.annualPerMonthUsd);
    });
});

describe('Subscription Plans › role mapping', () => {
    it('all plan IDs match canonical UserRole values', () => {
        const validRoles = ['vault', 'vault_pro', 'studio', 'hybrid'];
        PLANS.map((p) => p.id).forEach((id) => {
            expect(validRoles).toContain(id);
        });
    });

    it('studio plan includes selling-oriented features', () => {
        const studio = PLANS.find((p) => p.id === 'studio');
        expect(studio?.features).toContain('Unlimited Listings');
    });

    it('hybrid plan includes collaboration', () => {
        const hybrid = PLANS.find((p) => p.id === 'hybrid');
        expect(hybrid?.features).toContain('Team Collaboration');
    });
});
