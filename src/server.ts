/**
 * Build the MCP Server instance.
 *
 * Transports (stdio, HTTP) are wired in separate entrypoints to keep this
 * module portable between Claude Desktop (stdio) and Smithery / Vercel (HTTP).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  AUDIT_COMP_LIVE_LISTINGS,
  TOOLS,
  WALLET_AUDIT_RULESET,
} from "./tools.js";
import { callUpstream } from "./upstream.js";

export function buildServer(): Server {
  const server = new Server(
    {
      name: "cipher-x402-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description:
          t.description +
          (t.priceUsdc > 0
            ? ` Pass a signed x402 v2 authorization as the '_payment' argument to unlock the paid response. Without it, the tool returns the 402 accept-list for your wallet to sign.`
            : ""),
        inputSchema: {
          type: "object",
          properties: {
            ...t.inputSchema.properties,
            ...(t.priceUsdc > 0
              ? {
                  _payment: {
                    type: "string",
                    description:
                      "Optional. Signed x402 v2 X-PAYMENT header value (base64-encoded EIP-3009 authorization). If present, forwarded upstream; if absent, tool returns the 402 accept-list.",
                  },
                }
              : {}),
          },
          required: t.inputSchema.required ?? [],
        },
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;
    const args = (rawArgs ?? {}) as Record<string, unknown>;

    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      return {
        isError: true,
        content: [
          { type: "text", text: `Unknown tool: ${name}` },
        ],
      };
    }

    // Free educational tool — served locally. Dispatch by tool name.
    if (tool.endpoint === null) {
      const localPayload =
        name === "audit_comp_live_listings"
          ? AUDIT_COMP_LIVE_LISTINGS
          : WALLET_AUDIT_RULESET;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(localPayload, null, 2),
          },
        ],
      };
    }

    const paymentHeader =
      typeof args._payment === "string" && args._payment.length > 0
        ? String(args._payment)
        : undefined;
    // Don't forward `_payment` into the upstream URL builder.
    const { _payment, ...cleanArgs } = args;
    void _payment;

    try {
      const up = await callUpstream(tool, cleanArgs, paymentHeader);
      const header = up.isPaymentRequired
        ? `HTTP 402 Payment Required — upstream returned an x402 accept-list. ` +
          `Sign it with your wallet (USDC on Base, eip155:8453), then re-invoke ` +
          `this tool with '_payment' set to the base64 X-PAYMENT authorization.\n\n`
        : `HTTP ${up.status} (content-type: ${up.contentType}).\n\n`;
      return {
        content: [
          {
            type: "text",
            text: header + up.body,
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Upstream error for ${name}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
        ],
      };
    }
  });

  return server;
}
