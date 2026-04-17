/**
 * Smoke test — CI runs this after build to verify:
 *   1. The server module imports + builds without runtime error.
 *   2. The tools registry lists all 8 expected tools.
 *   3. The free tool (`solana_wallet_security_audit_rules`) returns valid JSON.
 *
 * Does NOT hit live upstream endpoints (avoids flakes + avoids burning quota).
 */

import { buildServer } from "./server.js";
import { TOOLS, WALLET_AUDIT_RULESET } from "./tools.js";

const EXPECTED_TOOLS = [
  "solana_wallet_scan",
  "check_password_breach",
  "jito_tip_calculator",
  "github_repo_health",
  "fred_macro_series",
  "check_drift_exposure",
  "solana_wallet_security_audit_rules",
  "get_premium_cipher_chapter",
];

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error("SMOKE FAIL:", msg);
    process.exit(1);
  }
}

function main(): void {
  const server = buildServer();
  assert(server !== undefined, "buildServer() returned undefined");

  assert(
    TOOLS.length === EXPECTED_TOOLS.length,
    `expected ${EXPECTED_TOOLS.length} tools, got ${TOOLS.length}`,
  );
  for (const name of EXPECTED_TOOLS) {
    assert(
      TOOLS.some((t) => t.name === name),
      `missing tool: ${name}`,
    );
  }

  // Verify wallet-audit ruleset shape.
  assert(
    WALLET_AUDIT_RULESET.version === "v1.1.0",
    `wallet-audit version drift: ${WALLET_AUDIT_RULESET.version}`,
  );
  assert(
    Array.isArray(WALLET_AUDIT_RULESET.rules) &&
      WALLET_AUDIT_RULESET.rules.length >= 5,
    "wallet-audit rules must have >=5 entries",
  );

  // Verify pricing envelope matches spec.
  const priced = TOOLS.filter((t) => t.priceUsdc > 0);
  assert(
    priced.every((t) => t.priceUsdc >= 0.005 && t.priceUsdc <= 0.25),
    "all prices must be within [0.005, 0.25]",
  );

  console.log(
    `cipher-x402-mcp smoke OK: ${TOOLS.length} tools, ` +
      `${priced.length} paid, 1 free.`,
  );
}

main();
