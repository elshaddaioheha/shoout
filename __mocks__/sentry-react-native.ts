export const init = jest.fn();
export const captureException = jest.fn();
export const withScope = jest.fn((callback: (scope: { setExtra: (key: string, value: unknown) => void }) => void) => {
  callback({
    setExtra: jest.fn(),
  });
});

