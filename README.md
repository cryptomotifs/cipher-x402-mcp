# cipher-x402-mcp

[![CI](https://github.com/cryptomotifs/cipher-x402-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/cryptomotifs/cipher-x402-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-server-8A2BE2)](https://modelcontextprotocol.io)
[![x402](https://img.shields.io/badge/x402-v2-00d084)](https://x402.org)

An MCP server that exposes 8 Solana / crypto / macro tools to any MCP-aware
client (Claude Desktop, Cursor, Cline, Continue, etc.). Seven of the tools
are gated behind the **x402** payment protocol — agents auto-pay in USDC on
Base, $0.005 – $0.25 per tool call. One tool is free (educational).

> The server is a **forward-only relay**: when an agent calls a paid tool
> without an `X-PAYMENT` header, we surface the upstream `HTTP 402` +
> accept-list verbatim so the agent's own wallet signs the payment. We
> never custody caller funds.

## Tools

| Tool | Price (USDC, Base) | Upstream |
|------|--------------------|----------|
| `solana_wallet_scan(address)` | $0.01 | `cipher-scan-three.vercel.app` |
| `check_password_breach(sha1_prefix)` | $0.005 | `cipher-pwned.vercel.app` |
| `jito_tip_calculator(pool_depth, expected_profit, slot_prob)` | $0.01 | `cipher-jito-tip.vercel.app` |
| `github_repo_health(owner, repo)` | $0.02 | `cipher-repo-health.vercel.app` |
| `fred_macro_series(series_id)` | $0.005 | `cipher-fred.vercel.app` |
| `check_drift_exposure(wallet)` | $0.01 | `cipher-drift-exposure.vercel.app` |
| `solana_wallet_security_audit_rules()` | **free** | local (v1.1.0 ruleset) |
| `get_premium_cipher_chapter(slug)` | $0.25 | `cipher-x402.vercel.app` |

Payment recipient: `0xa0630fAD18C732e94D56d2D5F630963eb8fB9640` (Base, USDC
`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`).

## Install (Claude Desktop)

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "cipher-x402": {
      "command": "npx",
      "args": ["-y", "cipher-x402-mcp"]
    }
  }
}
```

Restart Claude Desktop. The 8 tools show up in the tool tray.

## Install (Cursor / Cline / Continue)

Any MCP-over-stdio client works the same way — the launcher is
`npx -y cipher-x402-mcp`.

## Install (Smithery)

```bash
npx -y @smithery/cli install cipher-x402-mcp --client claude
```

## Remote HTTP transport

Deployed at **https://cipher-x402-mcp.vercel.app/mcp** (streamable HTTP).
Probe the manifest at the root URL.

## How payment works

1. Agent calls (e.g.) `solana_wallet_scan({ "address": "..." })` without
   a payment.
2. Server returns a structured result starting with
   `HTTP 402 Payment Required — upstream returned an x402 accept-list.`
   followed by the JSON accept-list (price, network, payTo, asset, etc.).
3. Agent's wallet signs an EIP-3009 authorization for the advertised
   `maxAmountRequired`.
4. Agent re-invokes the same tool with
   `{ "address": "...", "_payment": "<base64-signed-header>" }`.
5. Server forwards the `X-PAYMENT` header upstream, upstream's facilitator
   verifies + settles on Base, and the content is returned to the agent.

The server itself is stateless — no API keys, no user session, no funds.

## Develop locally

```bash
git clone https://github.com/cryptomotifs/cipher-x402-mcp
cd cipher-x402-mcp
npm install
npm run build
npm run smoke     # tool-registry smoke test
npm start         # stdio transport
npm run start:http  # HTTP transport on :8080
```

## Deploy HTTP transport (Vercel)

```bash
vercel link
vercel --prod
```

The `/mcp` route serves MCP JSON-RPC messages; `/` serves a lightweight
JSON manifest used by registries.

## Environment overrides

All upstream base URLs are overridable (useful for private mirrors):

```bash
CIPHER_SCAN_API_URL=https://your-scan.example.com \
CIPHER_PWNED_URL=https://your-pwned.example.com \
  npx cipher-x402-mcp
```

## Related

- **cipher-starter** — free MIT Solana solo-dev playbook
  ([github.com/cryptomotifs/cipher-starter](https://github.com/cryptomotifs/cipher-starter)).
- **cipher-solana-wallet-audit** — free GitHub Action (v1.1.0) that fails
  CI on plaintext Solana private keys
  ([github.com/cryptomotifs/cipher-solana-wallet-audit](https://github.com/cryptomotifs/cipher-solana-wallet-audit)).
- **cipher-x402** — four premium chapters, paid in USDC on Base at
  [cipher-x402.vercel.app](https://cipher-x402.vercel.app).

## License

MIT — see [LICENSE](LICENSE).
