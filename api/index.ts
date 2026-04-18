/**
 * Vercel GET / handler — lightweight JSON manifest for registries.
 *
 * x402_recipient is read from the X402_RECIPIENT env var at runtime so the
 * payout wallet is not hardcoded in source. Set it in Vercel project env
 * before deploy. Safe default falls back to an empty string so forks can
 * deploy without configuring a wallet (paid tools still forward the
 * upstream 402 accept-list to the caller; only the root-manifest hint is
 * omitted).
 *
 * Bazaar discovery hints (2026-04-18): we declare bazaar metadata for each
 * tool so x402-Bazaar-aware crawlers (Coinbase CDP `/v2/x402/discovery/*`,
 * x402.org `/facilitator/discovery/*`, x402.eco aggregators) can index our
 * tools by category + tags + per-tool example schemas WITHOUT having to
 * make a paid call first. Per Coinbase docs, opt-in registration also
 * requires `discoverable: true` on the upstream payment middleware
 * configuration, but advertising the bazaar shape on the public manifest
 * is itself a discovery signal for non-CDP crawlers.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { TOOLS, type ToolDef } from "../src/tools.js";

const TOOL_BAZAAR_META: Record<
  string,
  {
    category: string;
    tags: string[];
    output_example: Record<string, unknown>;
  }
> = {
  solana_wallet_scan: {
    category: "solana-data",
    tags: ["solana", "wallet", "portfolio", "audit", "agent-ready"],
    output_example: {
      address: "ED..wmrm",
      portfolio_usd: 412.55,
      stale_stake_accounts: 1,
      dust_token_count: 7,
    },
  },
  check_password_breach: {
    category: "security",
    tags: ["hibp", "password", "k-anonymity", "credential-stuffing"],
    output_example: { sha1_prefix: "21BD1", matched_suffixes: 1 },
  },
  jito_tip_calculator: {
    category: "solana-mev",
    tags: ["jito", "tip", "mev", "arbitrage", "solana"],
    output_example: { tip_lamports: 12500, tip_usd: 0.0021, ev_usd: 14.6 },
  },
  github_repo_health: {
    category: "developer-intelligence",
    tags: ["github", "repo-health", "due-diligence", "open-source"],
    output_example: {
      owner: "solana-labs",
      repo: "solana",
      score: 87,
      commits_per_week: 142,
    },
  },
  fred_macro_series: {
    category: "macro-data",
    tags: ["fred", "macro", "yields", "rates", "fed"],
    output_example: { series_id: "DGS10", latest_value: 4.18, observations: 12 },
  },
  check_drift_exposure: {
    category: "solana-defi",
    tags: ["drift", "perps", "leverage", "liquidation-risk", "solana"],
    output_example: {
      wallet: "ED..wmrm",
      open_positions: 2,
      unrealized_pnl_usd: 18.4,
      liquidation_distance_pct: 22.6,
    },
  },
  solana_wallet_security_audit_rules: {
    category: "security",
    tags: ["solana", "audit", "key-leak", "ci", "github-action", "free"],
    output_example: {
      ruleset_version: "1.1.0",
      rules: 9,
      install_url:
        "https://github.com/marketplace/actions/cipher-solana-wallet-audit",
    },
  },
  coinalyze_funding_rates: {
    category: "crypto-derivatives",
    tags: [
      "funding-rate",
      "perp",
      "open-interest",
      "binance",
      "bybit",
      "okx",
      "hyperliquid",
      "drift",
      "perp-arbitrage",
    ],
    output_example: {
      symbol: "BTC",
      oi_weighted_funding_apr: 0.048,
      max_venue: "BYBIT",
      min_venue: "DERIBIT",
      divergence_bps: 6.4,
    },
  },
  get_premium_cipher_chapter: {
    category: "research",
    tags: ["cipher", "trading", "research", "ebook", "premium"],
    output_example: { chapter_id: 3, content_md_chars: 12450, version: 1 },
  },
};

function buildBazaarHint(t: ToolDef): Record<string, unknown> | undefined {
  if (t.priceUsdc === 0) return undefined;
  const meta = TOOL_BAZAAR_META[t.name];
  if (!meta) return undefined;
  return {
    discoverable: true,
    category: meta.category,
    tags: meta.tags,
    price_usdc: t.priceUsdc,
    network: "eip155:8453",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    pay_to: process.env.X402_RECIPIENT ?? "",
    output: { example: meta.output_example },
  };
}

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): void {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "public, max-age=60");
  res.end(
    JSON.stringify(
      {
        name: "cipher-x402-mcp",
        version: "0.2.0",
        transports: ["stdio", "streamable-http"],
        mcp_endpoint: "/mcp",
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description.slice(0, 180),
          price_usdc: t.priceUsdc,
          input_schema: t.inputSchema,
          bazaar: buildBazaarHint(t),
        })),
        // Top-level x402 Bazaar discovery hints — picked up by x402.eco,
        // PulseMCP, Smithery, and any agent crawler that scans the root
        // manifest (not just CDP facilitator-cataloged endpoints).
        bazaar: {
          discoverable: true,
          publisher: "cryptomotifs",
          maintainer_github: "https://github.com/cryptomotifs",
          categories: [
            "solana-data",
            "solana-mev",
            "solana-defi",
            "security",
            "macro-data",
            "crypto-derivatives",
            "developer-intelligence",
            "research",
          ],
          discovery_hints: {
            cdp:
              "https://api.cdp.coinbase.com/platform/v2/x402/discovery/merchant?payTo=" +
              (process.env.X402_RECIPIENT ?? ""),
            x402_eco: "https://www.x402.eco",
            pulse_mcp: "https://www.pulsemcp.com",
            smithery: "https://smithery.ai",
          },
        },
        repo: "https://github.com/cryptomotifs/cipher-x402-mcp",
        docs: "https://github.com/cryptomotifs/cipher-x402-mcp#readme",
        x402_recipient: process.env.X402_RECIPIENT ?? "",
        x402_network: "eip155:8453",
        x402_asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      },
      null,
      2,
    ),
  );
}
