/**
 * CIPHER x402 MCP — tool registry.
 *
 * Each tool is a *forward-only* router: when invoked, it calls the upstream
 * CIPHER endpoint WITHOUT an `X-PAYMENT` header. Upstream responds with
 * HTTP 402 and the x402 v2 accept-list JSON. We relay that accept-list to the
 * MCP client (agent) verbatim, so the agent's own wallet pays and retries.
 *
 * This avoids burning our wallet and is what the spec calls "forward-only mode".
 *
 * When a caller DOES include an `x-payment` header through the MCP
 * `_payment` input field, we forward it to upstream and return the paid
 * response body.
 */

export interface ToolDef {
  name: string;
  description: string;
  priceUsdc: number;
  endpoint: string | null; // null = free educational tool
  method: "GET" | "POST";
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Build the upstream URL + optional body from MCP tool args. */
  build: (args: Record<string, unknown>) => {
    url: string;
    body?: Record<string, unknown>;
  };
}

const CIPHER_SCAN_API =
  process.env.CIPHER_SCAN_API_URL ?? "https://cipher-scan-three.vercel.app";
const CIPHER_PWNED =
  process.env.CIPHER_PWNED_URL ?? "https://cipher-pwned.vercel.app";
const CIPHER_JITO_TIP =
  process.env.CIPHER_JITO_TIP_URL ?? "https://cipher-jito-tip.vercel.app";
const CIPHER_REPO_HEALTH =
  process.env.CIPHER_REPO_HEALTH_URL ?? "https://cipher-repo-health.vercel.app";
const CIPHER_FRED =
  process.env.CIPHER_FRED_URL ?? "https://cipher-fred.vercel.app";
const CIPHER_DRIFT =
  process.env.CIPHER_DRIFT_URL ??
  "https://cipher-drift-exposure.vercel.app";
const CIPHER_X402 =
  process.env.CIPHER_X402_URL ?? "https://cipher-x402.vercel.app";
const CIPHER_COINALYZE =
  process.env.CIPHER_COINALYZE_URL ?? "https://cipher-coinalyze.vercel.app";

export const TOOLS: ToolDef[] = [
  {
    name: "solana_wallet_scan",
    description:
      "Scan a Solana wallet for portfolio value, dust accounts, stale stake accounts, and low-liquidity position warnings. Returns findings + referral CTAs. Priced at $0.01 USDC on Base (x402).",
    priceUsdc: 0.01,
    endpoint: CIPHER_SCAN_API,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description:
            "Base58 Solana wallet address (32-44 chars).",
        },
      },
      required: ["address"],
    },
    build: ({ address }) => ({
      url: `${CIPHER_SCAN_API}/api/scan?address=${encodeURIComponent(
        String(address),
      )}`,
    }),
  },
  {
    name: "check_password_breach",
    description:
      "Check whether a password hash prefix (SHA-1, first 5 chars) appears in the HIBP breach corpus. k-anonymity, no plaintext passwords sent. Priced at $0.005 USDC on Base (x402).",
    priceUsdc: 0.005,
    endpoint: CIPHER_PWNED,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        sha1_prefix: {
          type: "string",
          description:
            "First 5 uppercase hex characters of the SHA-1 hash of the password (e.g. '21BD1').",
          pattern: "^[0-9A-Fa-f]{5}$",
        },
      },
      required: ["sha1_prefix"],
    },
    build: ({ sha1_prefix }) => ({
      url: `${CIPHER_PWNED}/api/range/${encodeURIComponent(
        String(sha1_prefix).toUpperCase(),
      )}`,
    }),
  },
  {
    name: "jito_tip_calculator",
    description:
      "Compute an expected-value-maximizing Jito tip for a Solana arbitrage bundle. Inputs: pool_depth (USD), expected_profit (USD), slot_probability [0..1]. Returns tip lamports + EV breakdown. Priced at $0.01 USDC on Base (x402).",
    priceUsdc: 0.01,
    endpoint: CIPHER_JITO_TIP,
    method: "POST",
    inputSchema: {
      type: "object",
      properties: {
        pool_depth: {
          type: "number",
          description: "Target pool depth in USD.",
        },
        expected_profit: {
          type: "number",
          description: "Gross expected profit of the bundle in USD.",
        },
        slot_prob: {
          type: "number",
          description:
            "Probability the leader slot is a Jito validator [0..1].",
          minimum: 0,
          maximum: 1,
        },
      },
      required: ["pool_depth", "expected_profit", "slot_prob"],
    },
    build: ({ pool_depth, expected_profit, slot_prob }) => ({
      url: `${CIPHER_JITO_TIP}/api/tip`,
      body: {
        pool_depth: Number(pool_depth),
        expected_profit: Number(expected_profit),
        slot_prob: Number(slot_prob),
      },
    }),
  },
  {
    name: "github_repo_health",
    description:
      "Score a GitHub repository's health — commit cadence, issue-close latency, contributor diversity, CI green rate, release frequency. Returns 0-100 health score with per-factor breakdown. Priced at $0.02 USDC on Base (x402).",
    priceUsdc: 0.02,
    endpoint: CIPHER_REPO_HEALTH,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "GitHub org or user (e.g. 'solana-labs').",
        },
        repo: {
          type: "string",
          description: "Repo name (e.g. 'solana').",
        },
      },
      required: ["owner", "repo"],
    },
    build: ({ owner, repo }) => ({
      url: `${CIPHER_REPO_HEALTH}/api/health?owner=${encodeURIComponent(
        String(owner),
      )}&repo=${encodeURIComponent(String(repo))}`,
    }),
  },
  {
    name: "fred_macro_series",
    description:
      "Fetch a Federal Reserve Economic Data (FRED) series by ID — e.g. 'DGS10' (10Y yield), 'WALCL' (Fed balance sheet), 'T10Y2Y' (yield curve). Returns cleaned latest observations. Priced at $0.005 USDC on Base (x402).",
    priceUsdc: 0.005,
    endpoint: CIPHER_FRED,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        series_id: {
          type: "string",
          description:
            "FRED series ID (e.g. 'DGS10', 'WALCL', 'T10Y2Y', 'DFF').",
        },
      },
      required: ["series_id"],
    },
    build: ({ series_id }) => ({
      url: `${CIPHER_FRED}/api/series/${encodeURIComponent(
        String(series_id),
      )}`,
    }),
  },
  {
    name: "check_drift_exposure",
    description:
      "Check a Solana wallet's exposure to Drift Protocol — open perp positions, collateral, unrealized PnL, liquidation risk distance. Priced at $0.01 USDC on Base (x402).",
    priceUsdc: 0.01,
    endpoint: CIPHER_DRIFT,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        wallet: {
          type: "string",
          description: "Base58 Solana wallet address.",
        },
      },
      required: ["wallet"],
    },
    build: ({ wallet }) => ({
      url: `${CIPHER_DRIFT}/api/drift?wallet=${encodeURIComponent(
        String(wallet),
      )}`,
    }),
  },
  {
    name: "solana_wallet_security_audit_rules",
    description:
      "Return metadata for the cipher-solana-wallet-audit v1.1.0 ruleset — the free MIT GitHub Action that catches plaintext Solana private keys, seed phrases, and leaked .env files in CI. Free, no payment required. Intended for educational use and agent-driven repo hardening.",
    priceUsdc: 0,
    endpoint: null, // served locally, no upstream
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {},
    },
    build: () => ({ url: "local://wallet-audit-rules" }),
  },
  {
    name: "coinalyze_funding_rates",
    description:
      "Fetch perpetual-futures funding-rate intelligence for a given base asset (e.g. 'BTC', 'ETH', 'SOL') aggregated across 17 major perp venues — Binance, Bybit, OKX, BitMEX, Deribit, dYdX, Hyperliquid, Bitfinex, Huobi, Kraken, Phemex, WOO X, Aster, Lighter, Coinbase, Gate.io, Vertex. Returns per-exchange rate + USD open interest, OI-weighted aggregate funding, divergence in bps, and max/min funding exchange — pre-computed for perp-arbitrage bots. Priced at $0.01 USDC on Base (x402).",
    priceUsdc: 0.01,
    endpoint: CIPHER_COINALYZE,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description:
            "Base asset ticker (1-12 alphanumerics), e.g. 'BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'AVAX', 'LINK', 'APT', 'SUI'.",
          pattern: "^[A-Za-z0-9]{1,12}$",
        },
      },
      required: ["symbol"],
    },
    build: ({ symbol }) => ({
      url: `${CIPHER_COINALYZE}/api/funding/${encodeURIComponent(
        String(symbol).toUpperCase(),
      )}`,
    }),
  },
  {
    name: "get_premium_cipher_chapter",
    description:
      "Fetch a CIPHER premium chapter (markdown). Four chapters available: 'mev-deep-dive', 'three-tier-wallet', 'canadian-compliance', 'oracle-cloud-free-tier'. Priced at $0.25 USDC on Base (x402) per chapter.",
    priceUsdc: 0.25,
    endpoint: CIPHER_X402,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description:
            "Chapter slug: 'mev-deep-dive' | 'three-tier-wallet' | 'canadian-compliance' | 'oracle-cloud-free-tier'.",
          enum: [
            "mev-deep-dive",
            "three-tier-wallet",
            "canadian-compliance",
            "oracle-cloud-free-tier",
          ],
        },
      },
      required: ["slug"],
    },
    build: ({ slug }) => ({
      url: `${CIPHER_X402}/premium/${encodeURIComponent(String(slug))}`,
    }),
  },
];

export const WALLET_AUDIT_RULESET = {
  name: "cipher-solana-wallet-audit",
  version: "v1.1.0",
  license: "MIT",
  homepage: "https://github.com/cryptomotifs/cipher-solana-wallet-audit",
  marketplace:
    "https://github.com/marketplace/actions/cipher-solana-wallet-audit",
  description:
    "A free GitHub Action that fails CI on Solana wallet-security anti-patterns: plaintext private keys, seed phrases in comments, leaked .env files, hardcoded RPC URLs with embedded API keys.",
  rules: [
    {
      id: "solana-plaintext-secret-key",
      severity: "critical",
      pattern: "64-byte array or bs58 base58 secret key literal",
    },
    {
      id: "seed-phrase-bip39",
      severity: "critical",
      pattern: "12 or 24-word BIP-39 mnemonic in source / comment",
    },
    {
      id: "leaked-env-file",
      severity: "high",
      pattern: ".env tracked in git (checks git ls-files + .gitignore)",
    },
    {
      id: "hardcoded-rpc-with-key",
      severity: "high",
      pattern: "Helius / QuickNode / Alchemy URL with embedded API key",
    },
    {
      id: "private-key-json-path",
      severity: "critical",
      pattern: "Path to id.json / keypair.json in committed source",
    },
  ],
  usage: {
    workflow: ".github/workflows/wallet-audit.yml",
    snippet: [
      "name: Wallet Security",
      "on: [push, pull_request]",
      "jobs:",
      "  audit:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - uses: cryptomotifs/cipher-solana-wallet-audit@v1",
    ].join("\n"),
    inputs: {
      "fail-on": "low | medium | high | critical  (default: high)",
      include: "comma-separated globs (default: **/*)",
      exclude: "comma-separated globs",
    },
    outputs: {
      "findings-count": "total findings",
      "critical-count": "critical-severity findings",
    },
  },
};
