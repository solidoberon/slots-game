// Extend expect or set globals if needed for tests.
// Silence console.error in tests unless explicitly checking it.
const originalError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {
    // Allow explicit test assertions to restore or check errors.
    // Default: silence noise.
  });
});

afterAll(() => {
  (console.error as any).mockRestore?.();
  console.error = originalError;
});
