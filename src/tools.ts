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
const CIPHER_PUBMED =
  process.env.CIPHER_PUBMED_URL ?? "https://cipher-x402-pubmed.vercel.app";
const CIPHER_OSM =
  process.env.CIPHER_OSM_URL ?? "https://cipher-x402-osm.vercel.app";
const CIPHER_USDA =
  process.env.CIPHER_USDA_URL ?? "https://cipher-x402-usda.vercel.app";
const CIPHER_FDA =
  process.env.CIPHER_FDA_URL ?? "https://cipher-x402-fda.vercel.app";

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
      "Return metadata for the cipher-solana-wallet-audit v1.2.0 ruleset — the free MIT GitHub Action that catches Solana wallet anti-patterns in CI: plaintext private keys, seed phrases (in comments OR string literals), Anchor.toml wallet leaks, Drift-hack-derived admin bundles, leaked .env files, hardcoded RPC URLs. Free, no payment required.",
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
    name: "audit_comp_live_listings",
    description:
      "Return a curated snapshot of currently-live audit competitions and bug-bounty programs across Code4rena, Cantina, Sherlock, and direct-protocol channels. Useful for solo wardens triaging which contests to enter. Snapshot updates with each cipher-x402-mcp release; treat the data as a hint, always cross-check the platform before submitting. Free, no payment required.",
    priceUsdc: 0,
    endpoint: null, // served locally, no upstream
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {},
    },
    build: () => ({ url: "local://audit-comp-listings" }),
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
  {
    name: "pubmed_medical_search",
    description:
      "Search PubMed (NCBI) for medical / life-sciences literature by keyword. Returns enriched article list: pmid, title, authors, journal, year, pub_types, plus a year-range + has-meta-analysis / has-review enrichment block. Ideal for medical RAG agents. Priced at $0.005 USDC on Base (x402).",
    priceUsdc: 0.005,
    endpoint: CIPHER_PUBMED,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        term: {
          type: "string",
          description:
            "Free-text biomedical query (e.g. 'metformin liver', 'semaglutide cardiovascular outcomes').",
        },
        retmax: {
          type: "number",
          description: "Max articles to return (1-20). Default 5.",
          minimum: 1,
          maximum: 20,
        },
      },
      required: ["term"],
    },
    build: ({ term, retmax }) => {
      const q = new URLSearchParams({ term: String(term) });
      if (retmax != null) q.set("retmax", String(retmax));
      return { url: `${CIPHER_PUBMED}/search?${q}` };
    },
  },
  {
    name: "osm_geocode",
    description:
      "Forward geocoding via OpenStreetMap Nominatim. Address string → lat/lon + normalized address block (country_code, state, city, postcode, road) + match_quality label. Priced at $0.001 USDC on Base (x402).",
    priceUsdc: 0.001,
    endpoint: CIPHER_OSM,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Address to geocode (e.g. '1600 Pennsylvania Ave NW, Washington DC').",
        },
      },
      required: ["q"],
    },
    build: ({ q }) => ({
      url: `${CIPHER_OSM}/geocode?q=${encodeURIComponent(String(q))}`,
    }),
  },
  {
    name: "osm_reverse_geocode",
    description:
      "Reverse geocoding via OpenStreetMap Nominatim. lat/lon → normalized address + place class/type. Priced at $0.001 USDC on Base (x402).",
    priceUsdc: 0.001,
    endpoint: CIPHER_OSM,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        lat: { type: "number", description: "Latitude (WGS84)." },
        lon: { type: "number", description: "Longitude (WGS84)." },
      },
      required: ["lat", "lon"],
    },
    build: ({ lat, lon }) => ({
      url: `${CIPHER_OSM}/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
    }),
  },
  {
    name: "usda_food_nutrition",
    description:
      "USDA FoodData Central nutrition lookup. Query any food (brand or generic) and receive the best-matching record with a clean per_100g macro block (calories_kcal, protein_g, carb_g, fat_g, fiber_g, sugar_g, potassium_mg), plus alternates. Priced at $0.002 USDC on Base (x402).",
    priceUsdc: 0.002,
    endpoint: CIPHER_USDA,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Food name (e.g. 'banana', 'chicken breast raw').",
        },
        limit: {
          type: "number",
          description: "Alternates to return (1-10). Default 5.",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
    build: ({ query, limit }) => {
      const q = new URLSearchParams({ query: String(query) });
      if (limit != null) q.set("limit", String(limit));
      return { url: `${CIPHER_USDA}/food?${q}` };
    },
  },
  {
    name: "openfda_adverse_events",
    description:
      "openFDA drug adverse-event lookup for the last 12 months. Returns top reactions, report count, and seriousness breakdown (serious vs non-serious). Searches brand, generic, and medicinal-product names in parallel. Priced at $0.005 USDC on Base (x402).",
    priceUsdc: 0.005,
    endpoint: CIPHER_FDA,
    method: "GET",
    inputSchema: {
      type: "object",
      properties: {
        drug: {
          type: "string",
          description: "Drug name (brand or generic), e.g. 'ozempic', 'metformin'.",
        },
        limit: {
          type: "number",
          description: "Top-reaction count to return (1-25). Default 10.",
          minimum: 1,
          maximum: 25,
        },
      },
      required: ["drug"],
    },
    build: ({ drug, limit }) => {
      const q = new URLSearchParams({ drug: String(drug) });
      if (limit != null) q.set("limit", String(limit));
      return { url: `${CIPHER_FDA}/adverse?${q}` };
    },
  },
];

export const WALLET_AUDIT_RULESET = {
  name: "cipher-solana-wallet-audit",
  version: "v1.2.0",
  license: "MIT",
  homepage: "https://github.com/cryptomotifs/cipher-solana-wallet-audit",
  marketplace:
    "https://github.com/marketplace/actions/cipher-solana-wallet-audit",
  description:
    "A free GitHub Action that fails CI on Solana wallet-security anti-patterns: plaintext private keys, seed phrases (in comments OR string literals), Anchor.toml wallet leaks, post-Drift-hack admin patterns, leaked .env files, hardcoded RPC URLs with embedded API keys.",
  rules: [
    // v1.0 — base detection set
    {
      id: "PLAINTEXT_KEY",
      severity: "critical",
      pattern: "Base58 strings 86-90 chars (likely Solana secret keys).",
    },
    {
      id: "SEED_IN_COMMENT",
      severity: "critical",
      pattern: "12 or 24-word BIP-39 mnemonic inside a comment.",
    },
    {
      id: "JSON_KEYPAIR",
      severity: "critical",
      pattern: "64-integer JSON array (Solana CLI keypair format).",
    },
    {
      id: "ENV_LEAK",
      severity: "high",
      pattern: ".env present but not covered by any .gitignore.",
    },
    {
      id: "SOLANA_CONFIG_KEYPAIR",
      severity: "critical",
      pattern: "Tracked file matches `id.json` or `*-keypair.json`.",
    },
    {
      id: "HARDCODED_RPC",
      severity: "medium",
      pattern: "Mainnet RPC URL with embedded api-key= / token= query.",
    },
    // v1.1 — Drift-hack-derived correlations
    {
      id: "NONCE_ADVANCE_IN_MULTISIG",
      severity: "critical",
      pattern:
        "AdvanceNonce within 50 lines of SetAuthority / UpgradeProgram (Drift-hack pattern).",
    },
    {
      id: "LOW_LIQUIDITY_ORACLE_WHITELIST",
      severity: "high",
      pattern:
        "Oracle allow-list add with no preceding liquidity / depth check.",
    },
    {
      id: "UNBOUNDED_ADMIN_INSTRUCTION_BUNDLE",
      severity: "high",
      pattern:
        "Single tx bundles 2+ admin instructions (SetAuthority / UpgradeProgram).",
    },
    // v1.2 — additional commit-time leaks
    {
      id: "MNEMONIC_IN_STRING",
      severity: "critical",
      pattern:
        "12 or 24-word BIP-39 mnemonic as a string literal assigned to mnemonic / seed / wallet*phrase identifier.",
    },
    {
      id: "ANCHOR_WALLET_LEAK",
      severity: "critical",
      pattern:
        "Anchor.toml [provider].wallet path resolves to a keypair file inside the repo.",
    },
  ],
  changelog: [
    "v1.2.0 (2026-04-25) — added MNEMONIC_IN_STRING and ANCHOR_WALLET_LEAK.",
    "v1.1.0 (2026-04-18) — added the three Drift-hack-derived correlations.",
    "v1.0.0 (2026-04-15) — initial six commit-time leak patterns.",
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

/** Curated snapshot of currently-live audit-comp / bug-bounty programs.
 * Updated 2026-04-25.  Saturation column is informational, not a hard floor.
 * Always cross-check the platform listing before submitting. */
export const AUDIT_COMP_LIVE_LISTINGS = {
  snapshot_at: "2026-04-25",
  source_repo: "https://github.com/cryptomotifs/cipher-signal-engine",
  programs: [
    {
      platform: "code4rena",
      slug: "2026-04-monetrix",
      url: "https://code4rena.com/audits/2026-04-monetrix",
      kind: "competition",
      pool_usdc: 22000,
      ends_utc: "2026-05-04T20:00:00Z",
      language: "Solidity",
      chain: "HyperEVM",
      notes:
        "Monetrix USDC-backed synthetic dollar on HyperEVM. PoC required for H/M.",
    },
    {
      platform: "code4rena",
      slug: "2026-04-k2",
      url: "https://code4rena.com/audits/2026-04-k2",
      kind: "competition",
      pool_usdc: 135000,
      ends_utc: "2026-05-27T13:00:00Z",
      language: "Rust",
      chain: "Stellar / Soroban",
      notes: "K2 lending. Pooled, isolated, gated markets.",
    },
    {
      platform: "sherlock",
      slug: "1260",
      url: "https://audits.sherlock.xyz/contests/1260",
      kind: "competition",
      pool_usdc: 550000,
      currency: "RLUSD",
      ends_utc: "2026-04-27T09:30:00Z",
      language: "C++",
      chain: "XRP Ledger",
      notes:
        "XLS-0056 / 75 / 82 / 94 / 96 / 68 protocol features. Public-server admins trusted.",
    },
    {
      platform: "cantina",
      uuid: "55316f42-3c5e-4746-9bd0-0f18dcbc344b",
      url: "https://cantina.xyz/bounties/55316f42-3c5e-4746-9bd0-0f18dcbc344b",
      kind: "bounty",
      pool_usdc: 5000000,
      ongoing: true,
      language: "Solidity / Go",
      chain: "Ethereum + Base",
      notes:
        "Coinbase mainnet contracts + Base. Tier-0 critical = up to $5M; saturated (~750+ submissions).",
    },
    {
      platform: "cantina",
      uuid: "35a5f0a1-2ffd-432c-8f3b-77d169add8c3",
      url: "https://cantina.xyz/bounties/35a5f0a1-2ffd-432c-8f3b-77d169add8c3",
      kind: "bounty",
      pool_usdc: 2500000,
      ongoing: true,
      language: "Solidity",
      chain: "Ethereum + L2s",
      notes:
        "Morpho — 11 in-scope repos (vault-v2, morpho-blue, metamorpho, IRM, oracles, pre-liq, public-allocator, URD, adapter-registries).",
    },
    {
      platform: "cantina",
      uuid: "253a4e11-c99c-49e9-83f7-d076d8804475",
      url: "https://cantina.xyz/bounties/253a4e11-c99c-49e9-83f7-d076d8804475",
      kind: "bounty",
      pool_usdc: 500000,
      ongoing: true,
      language: "Rust / Anchor",
      chain: "Solana",
      notes:
        "pump.fun — 3 programs (Pump, Pump Fees, Pump AMM). Source closed; IDL + docs public at github.com/pump-fun/pump-public-docs.",
    },
    {
      platform: "cantina",
      uuid: "f9c0e285-1713-48f6-ac80-3271892c87f5",
      url: "https://cantina.xyz/bounties/f9c0e285-1713-48f6-ac80-3271892c87f5",
      kind: "bounty",
      pool_usdc: 100000,
      ongoing: true,
      language: "Solidity",
      chain: "Ethereum + L2s",
      notes:
        "Sablier — airdrops, flow, lockup. 6 prior audits. Public audits at github.com/sablier-labs/audits.",
    },
    {
      platform: "cantina",
      uuid: "78a734d2-b460-4245-9c81-833487d6a339",
      url: "https://cantina.xyz/bounties/78a734d2-b460-4245-9c81-833487d6a339",
      kind: "bounty",
      pool_usdc: 75000,
      ongoing: true,
      language: "Solidity",
      chain: "Ethereum",
      notes: "BitGo ETH multisig v2 + v4. Modern OZ patterns in v4.",
    },
    {
      platform: "solana-foundation",
      url: "mailto:security@solana.com",
      kind: "cold-disclose",
      pool_usdc_max: 2000000,
      ongoing: true,
      language: "Rust / C / C++",
      chain: "Solana validator clients",
      notes:
        "Direct cold-disclose for consensus / validator-client divergences. SLA 30 days.",
    },
    {
      platform: "colosseum-frontier",
      url: "https://www.colosseum.com/frontier",
      kind: "hackathon",
      pool_usdc: 640000,
      ends_utc: "2026-05-11T03:59:00Z",
      language: "Any (Solana focus)",
      chain: "Solana + Base + others",
      notes:
        "Frontier hackathon. Grand $30K + 20 standout teams $10K each + $390K side tracks + $250K accelerator pre-seed.",
    },
  ],
};
