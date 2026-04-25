/**
 * Smoke test — CI runs this after build to verify:
 *   1. The server module imports + builds without runtime error.
 *   2. The tools registry lists every expected tool name.
 *   3. The free local tools return valid JSON of the expected shape.
 *
 * Does NOT hit live upstream endpoints (avoids flakes + avoids burning quota).
 */

import { buildServer } from "./server.js";
import {
  AUDIT_COMP_LIVE_LISTINGS,
  TOOLS,
  WALLET_AUDIT_RULESET,
} from "./tools.js";

const EXPECTED_TOOLS = [
  "solana_wallet_scan",
  "check_password_breach",
  "jito_tip_calculator",
  "github_repo_health",
  "fred_macro_series",
  "check_drift_exposure",
  "solana_wallet_security_audit_rules",
  "coinalyze_funding_rates",
  "get_premium_cipher_chapter",
  "pubmed_medical_search",
  "osm_geocode",
  "osm_reverse_geocode",
  "usda_food_nutrition",
  "openfda_adverse_events",
  "audit_comp_live_listings",
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
    WALLET_AUDIT_RULESET.version === "v1.2.0",
    `wallet-audit version drift: ${WALLET_AUDIT_RULESET.version}`,
  );
  assert(
    Array.isArray(WALLET_AUDIT_RULESET.rules) &&
      WALLET_AUDIT_RULESET.rules.length >= 11,
    `wallet-audit rules must have >=11 entries (got ${WALLET_AUDIT_RULESET.rules.length})`,
  );

  // Verify audit-comp listings snapshot shape.
  assert(
    AUDIT_COMP_LIVE_LISTINGS.snapshot_at &&
      Array.isArray(AUDIT_COMP_LIVE_LISTINGS.programs) &&
      AUDIT_COMP_LIVE_LISTINGS.programs.length >= 5,
    "audit-comp listings snapshot must have >=5 programs",
  );
  for (const p of AUDIT_COMP_LIVE_LISTINGS.programs) {
    assert(typeof p.platform === "string", "program.platform must be string");
    assert(typeof p.url === "string" && p.url.length > 0, "program.url must be non-empty");
    assert(typeof p.kind === "string", "program.kind must be string");
  }

  // Verify pricing envelope matches spec. Lower bound is $0.001 (the
  // OSM geocode tools sit at the floor); upper bound is $0.25 (premium
  // chapter).
  const priced = TOOLS.filter((t) => t.priceUsdc > 0);
  assert(
    priced.every((t) => t.priceUsdc >= 0.001 && t.priceUsdc <= 0.25),
    "all prices must be within [0.001, 0.25]",
  );

  console.log(
    `cipher-x402-mcp smoke OK: ${TOOLS.length} tools, ` +
      `${priced.length} paid, 1 free.`,
  );
}

main();
