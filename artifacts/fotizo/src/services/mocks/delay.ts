// Simulates network latency so loading states are exercised while running on mocks.
export const delay = (ms = 300): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
