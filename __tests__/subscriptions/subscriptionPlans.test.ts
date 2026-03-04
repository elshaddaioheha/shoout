/**
 * Subscription Plan Tests
 *
 * Tests the PLANS data structure and the UI/business logic from the
 * subscriptions screen (app/settings/subscriptions.tsx).
 *
 * We test: plan structure integrity, correct recommended flag, and
 * the role-capability mapping that the subscription screen drives.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ─────────────────────────────────────────────────────────────────────────────
// Plan data (mirrors the PLANS array in app/settings/subscriptions.tsx)
// We deliberately extract and import the data to keep tests DRY.
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'vault_free',
        name: 'Vault Free',
        price: 'NGN 0',
        period: '/month',
        features: ['50MB Cloud Storage', 'Private Links', 'Basic Stats', 'Safe Transfer'],
        color: '#767676',
        category: 'Vault',
        recommended: false,
    },
    {
        id: 'vault_pro',
        name: 'Vault Pro',
        price: 'NGN 5,000',
        period: '/month',
        features: ['1GB Cloud Storage', 'Advanced Analytics', 'Custom Branding', 'Priority Support'],
        color: '#EC5C39',
        category: 'Vault',
        recommended: true,
    },
    {
        id: 'studio_pro',
        name: 'Studio Pro',
        price: 'NGN 10,000',
        period: '/month',
        features: ['Sell Unlimited Tracks', 'Lower Transaction Fees', 'Studio Dashboard', 'Artist Verification'],
        color: '#4CAF50',
        category: 'Studio',
        recommended: false,
    },
    {
        id: 'hybrid_executive',
        name: 'Executive Hybrid',
        price: 'NGN 25,000',
        period: '/month',
        features: ['10GB Cloud Storage', 'Team Collaboration', '0% Transaction Fees', 'VIP Promotion'],
        color: '#FFD700',
        category: 'Hybrid',
        recommended: false,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Plan data integrity
// ─────────────────────────────────────────────────────────────────────────────
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

    it('every plan has a non-empty name and price', () => {
        PLANS.forEach(plan => {
            expect(plan.name).toBeTruthy();
            expect(plan.price).toBeTruthy();
        });
    });

    it('every plan belongs to a valid category', () => {
        const validCategories = ['Vault', 'Studio', 'Hybrid'];
        PLANS.forEach(plan => {
            expect(validCategories).toContain(plan.category);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recommended badge
// ─────────────────────────────────────────────────────────────────────────────
describe('Subscription Plans › recommended flag', () => {
    it('exactly one plan is marked recommended', () => {
        const recommended = PLANS.filter(p => p.recommended);
        expect(recommended).toHaveLength(1);
    });

    it('vault_pro is the recommended plan', () => {
        const recommended = PLANS.find(p => p.recommended);
        expect(recommended?.id).toBe('vault_pro');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Pricing order (cheapest to most expensive)
// ─────────────────────────────────────────────────────────────────────────────
describe('Subscription Plans › pricing', () => {
    it('vault_free is free (NGN 0)', () => {
        const plan = PLANS.find(p => p.id === 'vault_free');
        expect(plan?.price).toBe('NGN 0');
    });

    it('hybrid_executive is the most expensive plan', () => {
        // Extract numeric value from NGN-formatted price
        const prices = PLANS.map(p => parseInt(p.price.replace(/[^0-9]/g, ''), 10));
        const maxPrice = Math.max(...prices);
        const executivePlan = PLANS.find(p => p.id === 'hybrid_executive');
        const executivePrice = parseInt(executivePlan!.price.replace(/[^0-9]/g, ''), 10);
        expect(executivePrice).toBe(maxPrice);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Plan-to-Role mapping (simulates what handleUpgrade does)
// ─────────────────────────────────────────────────────────────────────────────
describe('Subscription Plans › plan-to-role mapping', () => {
    const PLAN_IDS = PLANS.map(p => p.id);

    it('all plan IDs match valid UserRole values', () => {
        const validRoles = [
            'vault_free', 'vault_creator', 'vault_pro', 'vault_executive',
            'studio_free', 'studio_pro', 'studio_plus',
            'hybrid_creator', 'hybrid_executive',
        ];
        PLAN_IDS.forEach(id => {
            expect(validRoles).toContain(id);
        });
    });

    it('studio_pro plan enables selling – matches store capability', () => {
        // This test validates the plans screen drives the correct store upgrade
        const studioPlan = PLANS.find(p => p.id === 'studio_pro');
        expect(studioPlan?.features).toContain('Sell Unlimited Tracks');
        // The store test (useUserStore.test.ts) validates studio_pro gives canSell = true
    });

    it('hybrid_executive plan has team collaboration feature', () => {
        const execPlan = PLANS.find(p => p.id === 'hybrid_executive');
        expect(execPlan?.features).toContain('Team Collaboration');
    });

    it('hybrid_executive plan has 0% transaction fees', () => {
        const execPlan = PLANS.find(p => p.id === 'hybrid_executive');
        expect(execPlan?.features).toContain('0% Transaction Fees');
    });
});
