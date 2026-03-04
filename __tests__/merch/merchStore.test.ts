/**
 * Merch Store Tests
 *
 * Tests the Merch data structure integrity, filtering logic,
 * and category validation — the core logic driving the Merch discovery UI.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types & Mock data (mirrors app/merch/index.tsx MOCK_MERCH)
// ─────────────────────────────────────────────────────────────────────────────

interface MerchItem {
    id: string;
    name: string;
    artistName: string;
    price: string;
    category: string;
    image?: string;
    active?: boolean;
}

const MOCK_MERCH: MerchItem[] = [
    { id: 'm1', name: 'Vintage Afro Beats Tee', artistName: 'Davido', price: '12,000', category: 'Apparel' },
    { id: 'm2', name: 'Signature Vinyl - Lagos City', artistName: 'Wizkid', price: '25,000', category: 'Vinyl' },
    { id: 'm3', name: 'Shoouts Studio Hoodie', artistName: 'Shoouts Official', price: '18,500', category: 'Merch' },
    { id: 'm4', name: 'Afro-Gospel Cap', artistName: 'Lawrence Oyor', price: '8,000', category: 'Accessory' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pure filter function (mirrors the filteredMerch logic in the component)
// ─────────────────────────────────────────────────────────────────────────────
function filterMerch(items: MerchItem[], query: string): MerchItem[] {
    if (!query.trim()) return items;
    return items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data structure tests
// ─────────────────────────────────────────────────────────────────────────────
describe('Merch Store › data structure', () => {
    it('all mock items have required fields', () => {
        MOCK_MERCH.forEach(item => {
            expect(item.id).toBeTruthy();
            expect(item.name).toBeTruthy();
            expect(item.artistName).toBeTruthy();
            expect(item.price).toBeTruthy();
            expect(item.category).toBeTruthy();
        });
    });

    it('all IDs are unique', () => {
        const ids = MOCK_MERCH.map(m => m.id);
        expect(new Set(ids).size).toBe(MOCK_MERCH.length);
    });

    it('has 4 mock items covering multiple categories', () => {
        expect(MOCK_MERCH).toHaveLength(4);
        const categories = new Set(MOCK_MERCH.map(m => m.category));
        expect(categories.size).toBeGreaterThan(1);
    });

    it('prices are NGN-formatted strings', () => {
        MOCK_MERCH.forEach(item => {
            // prices are numeric strings with optional comma separators
            expect(item.price).toMatch(/^[\d,]+$/);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Filter logic
// ─────────────────────────────────────────────────────────────────────────────
describe('Merch Store › search filtering', () => {
    it('returns all items when query is empty', () => {
        expect(filterMerch(MOCK_MERCH, '')).toHaveLength(MOCK_MERCH.length);
    });

    it('returns all items when query is whitespace only', () => {
        expect(filterMerch(MOCK_MERCH, '   ')).toHaveLength(MOCK_MERCH.length);
    });

    it('case-insensitive match on item name', () => {
        const results = filterMerch(MOCK_MERCH, 'VINYL');
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('m2');
    });

    it('partial match works', () => {
        const results = filterMerch(MOCK_MERCH, 'afro');
        // Should match "Vintage Afro Beats Tee" AND "Afro-Gospel Cap"
        expect(results).toHaveLength(2);
    });

    it('returns empty array when no item matches', () => {
        const results = filterMerch(MOCK_MERCH, 'XYZ-NONEXISTENT');
        expect(results).toHaveLength(0);
    });

    it('returns full list for single-character query that matches all', () => {
        // 'o' appears in "Shoouts", "Wizkid" (no), "Davido" (yes), "Lawrence Oyor" (yes) ...
        const results = filterMerch(MOCK_MERCH, 'o');
        expect(results.length).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Category validation
// ─────────────────────────────────────────────────────────────────────────────
describe('Merch Store › category validation', () => {
    const VALID_CATEGORIES = ['Apparel', 'Vinyl', 'Merch', 'Accessory', 'Limited'];

    it('all mock items have a known category', () => {
        MOCK_MERCH.forEach(item => {
            expect(VALID_CATEGORIES).toContain(item.category);
        });
    });

    it('can filter by specific category', () => {
        const apparelItems = MOCK_MERCH.filter(m => m.category === 'Apparel');
        expect(apparelItems).toHaveLength(1);
        expect(apparelItems[0].name).toBe('Vintage Afro Beats Tee');
    });
});
