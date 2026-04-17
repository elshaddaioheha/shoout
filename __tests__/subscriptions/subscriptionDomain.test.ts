jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { canAccessAppMode, getFeatureFlags, getVaultCapabilities } from '../../utils/subscriptions';

describe('subscription domain access rules', () => {
    it('shoout has no storage capability', () => {
        const flags = getFeatureFlags('shoout');
        expect(flags.canUpload).toBe(false);
        expect(flags.canUseVaultStorage).toBe(false);
        expect(flags.storageLimitGB).toBe(0);
        expect(flags.maxVaultUploads).toBe(0);
    });

    it('shoout cannot access vault mode', () => {
        expect(canAccessAppMode('shoout', 'vault')).toBe(false);
    });

    it('all users can preview studio and hybrid modes', () => {
        expect(canAccessAppMode('shoout', 'studio')).toBe(true);
        expect(canAccessAppMode('shoout', 'hybrid')).toBe(true);
        expect(canAccessAppMode('vault', 'studio')).toBe(true);
        expect(canAccessAppMode('vault', 'hybrid')).toBe(true);
    });

    it('vault subscriptions can access vault mode', () => {
        expect(canAccessAppMode('vault', 'vault')).toBe(true);
        expect(canAccessAppMode('vault_pro', 'vault')).toBe(true);
        expect(canAccessAppMode('hybrid', 'vault')).toBe(true);
    });

    it('vault and vault_pro expose the agreed upload limits', () => {
        expect(getVaultCapabilities('vault')).toMatchObject({
            canAccessVaultWorkspace: true,
            canUploadToVault: true,
            maxVaultUploads: 50,
            storageLimitGB: 0.05,
        });
        expect(getVaultCapabilities('vault_pro')).toMatchObject({
            canAccessVaultWorkspace: true,
            canUploadToVault: true,
            maxVaultUploads: 500,
            storageLimitGB: 5,
        });
    });

    it('hybrid inherits the vault pro vault limits', () => {
        expect(getVaultCapabilities('hybrid')).toMatchObject({
            canAccessVaultWorkspace: true,
            maxVaultUploads: 500,
            storageLimitGB: 10,
        });
    });
});
