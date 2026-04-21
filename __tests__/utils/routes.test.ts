import { ROUTES, normalizeAppPath, resolveModeHomePath } from '@/utils/routes';

describe('route helpers', () => {
  it('normalizes grouped tab routes to public paths', () => {
    expect(normalizeAppPath('/(tabs)/search')).toBe(ROUTES.tabs.search);
    expect(normalizeAppPath('/chat/index')).toBe(ROUTES.chat.index);
  });

  it('normalizes root slash to tabs home', () => {
    expect(normalizeAppPath('/')).toBe(ROUTES.tabs.home);
  });

  it('rejects unsafe redirect paths', () => {
    expect(normalizeAppPath('https://example.com')).toBeNull();
    expect(normalizeAppPath('//evil.com')).toBeNull();
  });

  it('resolves mode home through a centralized helper', () => {
    expect(resolveModeHomePath('shoout')).toBe(ROUTES.tabs.home);
    expect(resolveModeHomePath('vault')).toBe(ROUTES.tabs.home);
    expect(resolveModeHomePath('studio')).toBe(ROUTES.tabs.home);
  });
});
