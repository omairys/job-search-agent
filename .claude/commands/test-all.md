Run all project test scripts in order and report results:

1. `pnpm run typecheck` — TypeScript type check (no emit)
2. `pnpm run test:connection` — verify Claude API
3. `pnpm run test:remotive` — verify Remotive
4. `pnpm run test:agent` — verify agent logic (mock mode)

For each test show: ✅ OK / ❌ FAIL with the error if applicable.
At the end give a summary of how many passed.
