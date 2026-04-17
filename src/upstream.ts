/**
 * Upstream x402 bridge.
 *
 * Forward-only semantics:
 *
 * 1. If the caller did NOT supply `_payment`, we call upstream without
 *    X-PAYMENT. Upstream replies 402 with an accept-list. We relay the
 *    accept-list back to the MCP client as a structured JSON tool result
 *    with `isError: false` (the 402 is expected flow, not an error).
 *
 * 2. If the caller supplied `_payment` (the signed x402 v2 authorization),
 *    we pass it through as `X-PAYMENT` and relay the upstream response.
 *
 * 3. Network / non-402 errors surface as `isError: true` with a compact
 *    diagnostic. Upstream 4xx bodies are relayed verbatim to let the agent
 *    decide how to react.
 */

import type { ToolDef } from "./tools.js";

export interface UpstreamResult {
  status: number;
  contentType: string;
  body: string;
  /** True when status is 402 (agent should pay + retry). */
  isPaymentRequired: boolean;
}

export async function callUpstream(
  tool: ToolDef,
  args: Record<string, unknown>,
  paymentHeader?: string,
): Promise<UpstreamResult> {
  const { url, body } = tool.build(args);

  const headers: Record<string, string> = {
    "user-agent": "cipher-x402-mcp/0.1.0",
    accept:
      "application/json, text/markdown;q=0.9, text/plain;q=0.5, */*;q=0.1",
  };
  if (paymentHeader) {
    headers["x-payment"] = paymentHeader;
  }

  const init: RequestInit = { method: tool.method, headers };
  if (tool.method === "POST" && body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new Error(
      `Upstream fetch failed for ${tool.name}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
    body: text,
    isPaymentRequired: res.status === 402,
  };
}
