/** Prevent a hosting environment override from silently shipping demo identities/data. */
export function assertSafeBuild(
  mode: string,
  env: Record<string, string>,
): void {
  if (mode === "demo") return;
  if (env.VITE_DEMO_MODE === "true")
    throw new Error(
      "VITE_DEMO_MODE is only allowed in an explicit demo build.",
    );
  if (env.VITE_USE_MOCKS !== "false")
    throw new Error("Release builds require VITE_USE_MOCKS=false.");
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("VITE_USE_MOCK_") && value !== "false") {
      throw new Error(`Release builds require ${name}=false.`);
    }
  }
  // Unlike other domain flags, the legacy shop flag defaults to true.
  if (env.VITE_USE_MOCK_SHOP !== "false")
    throw new Error("Release builds require VITE_USE_MOCK_SHOP=false.");
}
