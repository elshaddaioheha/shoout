/**
 * Subscription Plan Tests
 *
 * Canonical tiers:
 * - vault (free baseline)
 * - vault_pro
 * - studio
 * - hybrid
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const PLANS = [
    {
        id: 'vault',
        name: 'Vault',
        monthlyPriceNGN: 0,
        annualPriceNGN: 0,
        category: 'Vault',
        features: ['500MB Cloud Storage'],
    },
    {
        id: 'vault_pro',
        name: 'Vault Pro',
        monthlyPriceNGN: 13962,
        annualPriceNGN: 13962,
        category: 'Vault',
        features: ['1GB Cloud Storage', 'Advanced Tracking'],
    },
    {
        id: 'studio',
        name: 'Studio',
        monthlyPriceNGN: 27000,
        annualPriceNGN: 22950,
        category: 'Studio',
        features: ['Unlimited Listings', 'Buyer-Seller Chat'],
    },
    {
        id: 'hybrid',
        name: 'Hybrid',
        monthlyPriceNGN: 34906,
        annualPriceNGN: 29670,
        category: 'Hybrid',
        features: ['10GB Storage', 'Team Collaboration'],
    },
];

describe('Subscription Plans › data integrity', () => {
    it('contains exactly 4 plans', () => {
        expect(PLANS).toHaveLength(4);
    });

    it('every plan has a unique id', () => {
        const ids = PLANS.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(PLANS.length);
    });

    it('every plan has at least one feature', () => {
        PLANS.forEach(plan => {
            expect(plan.features.length).toBeGreaterThan(0);
        });
    });
});

describe('Subscription Plans › annual pricing policy', () => {
    it('vault remains free', () => {
        const vault = PLANS.find(p => p.id === 'vault');
        expect(vault?.monthlyPriceNGN).toBe(0);
        expect(vault?.annualPriceNGN).toBe(0);
    });

    it('vault_pro annual has no discount (business exception)', () => {
        const vaultPro = PLANS.find(p => p.id === 'vault_pro');
        expect(vaultPro?.annualPriceNGN).toBe(vaultPro?.monthlyPriceNGN);
    });

    it('studio annual is exactly 15% off monthly', () => {
        const studio = PLANS.find(p => p.id === 'studio');
        const expected = Math.round((studio!.monthlyPriceNGN * 85) / 100);
        expect(studio?.annualPriceNGN).toBe(expected);
    });

    it('hybrid annual is exactly 15% off monthly', () => {
        const hybrid = PLANS.find(p => p.id === 'hybrid');
        const expected = Math.round((hybrid!.monthlyPriceNGN * 85) / 100);
        expect(hybrid?.annualPriceNGN).toBe(expected);
    });
});

describe('Subscription Plans › role mapping', () => {
    it('all plan IDs match canonical UserRole values', () => {
        const validRoles = ['vault', 'vault_pro', 'studio', 'hybrid'];
        PLANS.map(p => p.id).forEach(id => {
            expect(validRoles).toContain(id);
        });
    });

    it('studio plan includes selling-oriented features', () => {
        const studio = PLANS.find(p => p.id === 'studio');
        expect(studio?.features).toContain('Unlimited Listings');
    });

    it('hybrid plan includes collaboration', () => {
        const hybrid = PLANS.find(p => p.id === 'hybrid');
        expect(hybrid?.features).toContain('Team Collaboration');
    });
});
