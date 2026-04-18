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

**Free + MIT-licensed.** Fork it, ship your own, no strings.

---

## Hosted Plans (MCPize)

Prefer not to self-host? A managed listing is live on MCPize with gateway
proxying, rate limiting, API-key auth, and consolidated billing:

**[mcpize.com/mcp/cipher-x402-mcp](https://mcpize.com/mcp/cipher-x402-mcp)**

| Plan | Price | Requests / mo | Rate limit | Includes |
|------|-------|---------------|------------|----------|
| Free | $0 | 100 | 10 / min | Free tools + `solana_wallet_scan` |
| Starter | $9 | 1,000 | 60 / min | 4 read-only tools (scan, HIBP, repo health, FRED) |
| Pro (recommended) | $29 | 5,000 | 120 / min | All 8 tools, priority GitHub support |
| Team | $99 | 25,000 | 600 / min | All 8 tools + custom upstream override, 24h response SLA |

Pay-as-you-go via MCPize's gateway. Self-host is still free (this repo, MIT).

---

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

Base network, USDC asset `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. The
current x402 payout recipient is exposed via the root `/` JSON manifest at
runtime — agents discover it automatically, you don't configure it by hand.

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

---

## 🏃 Run it yourself

### Prerequisites

- **Node.js 20+** (22 recommended)
- **npm 10+**
- A Vercel account (free tier) if you want to deploy the HTTP transport
- No API keys required for local stdio use — the server is a pass-through
  to public upstream endpoints

### Clone + build

```bash
git clone https://github.com/cryptomotifs/cipher-x402-mcp
cd cipher-x402-mcp
npm install
npm run build
npm run smoke     # tool-registry smoke test
npm start         # stdio transport
npm run start:http  # HTTP transport on :8080
```

### Configure your own upstream endpoints (optional)

All upstream base URLs are overridable via env — useful if you fork the
upstream endpoints to your own Vercel project and want the MCP server to
route to them:

```bash
CIPHER_SCAN_API_URL=https://your-scan.example.com \
CIPHER_PWNED_URL=https://your-pwned.example.com \
CIPHER_JITO_TIP_URL=https://your-jito.example.com \
CIPHER_REPO_HEALTH_URL=https://your-repo-health.example.com \
CIPHER_FRED_URL=https://your-fred.example.com \
CIPHER_DRIFT_URL=https://your-drift.example.com \
CIPHER_X402_URL=https://your-x402.example.com \
  npx cipher-x402-mcp
```

### Deploy to Vercel

```bash
vercel link
vercel --prod
```

The `/mcp` route serves MCP JSON-RPC messages; `/` serves a lightweight
JSON manifest used by registries.

---

## 🙏 Support

This is free + MIT. If it saved you time, tips in SOL are appreciated:

`cR9KrbsLVJvir5rY9cfY3WeNoxMwUGofzpCoVyobryy`

No pressure — star the repo or share it and that's equally valued.

---

## 💼 Hire me

Solo Canadian dev (Ontario, ET). Available 20 hr/wk for x402 / MCP / Solana integration work.

**Fixed-price SKUs:**

| # | Service | Price | Duration |
|---|---------|-------|----------|
| 1 | Wire x402 into your Next.js / Node app — merged PR + live test | **$900** | 2 days |
| 2 | x402 or Solana bot architecture + security review — written report + 60-min call | **$1000** | 1 day |
| 3 | AI-agent paid-API: 0 → live on Base with MCP wrapper | **$1200** | 3 days |

**Hourly:** $150/hr open-scope, 5-hour minimum block. $125/hr if 40+ hours upfront.

**Payout:** USDC on Base `0x2a33D2414312e8776dA4011c2586c2d067267210`, USDC on Solana `cR9KrbsLVJvir5rY9cfY3WeNoxMwUGofzpCoVyobryy`, or Wise-USD on request.

**Engage:** open an issue titled `[Consulting]: <what you need>` on [this repo](https://github.com/cryptomotifs/cipher-x402-mcp/issues/new), or DM [@cryptomotifs@techhub.social](https://techhub.social/@cryptomotifs). I reply within the hour with scope + 50% deposit address.

**Walkthrough of the settlement-path hardening I ship:** [dev.to/sai_93caeceb4f6a4d9969910/shipped-x402-paid-endpoint-starter-kit-nextjs-16-5g39](https://dev.to/sai_93caeceb4f6a4d9969910/shipped-x402-paid-endpoint-starter-kit-nextjs-16-5g39)

---

## Related

- **cipher-starter** — free MIT Solana solo-dev playbook
  ([github.com/cryptomotifs/cipher-starter](https://github.com/cryptomotifs/cipher-starter)).
- **cipher-solana-bot-toolkit** — free MIT toolkit: flash-loan router, volume bot,
  arb/MEV predator, memecoin launcher, copy trader — 5 scrubbed modules
  ([github.com/cryptomotifs/cipher-solana-bot-toolkit](https://github.com/cryptomotifs/cipher-solana-bot-toolkit)).
- **cipher-solana-wallet-audit** — free GitHub Action (v1.1.0) that fails
  CI on plaintext Solana private keys
  ([github.com/cryptomotifs/cipher-solana-wallet-audit](https://github.com/cryptomotifs/cipher-solana-wallet-audit)).

## License

MIT — see [LICENSE](LICENSE).
