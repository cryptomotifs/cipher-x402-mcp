/**
 * Vercel GET / handler — lightweight JSON manifest for registries.
 *
 * x402_recipient is read from the X402_RECIPIENT env var at runtime so the
 * payout wallet is not hardcoded in source. Set it in Vercel project env
 * before deploy. Safe default falls back to an empty string so forks can
 * deploy without configuring a wallet (paid tools still forward the
 * upstream 402 accept-list to the caller; only the root-manifest hint is
 * omitted).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { TOOLS } from "../src/tools.js";

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
        version: "0.1.0",
        transports: ["stdio", "streamable-http"],
        mcp_endpoint: "/mcp",
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description.slice(0, 180),
          price_usdc: t.priceUsdc,
        })),
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
