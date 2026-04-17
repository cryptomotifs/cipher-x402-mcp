/**
 * Vercel serverless entrypoint for the streamable-HTTP MCP transport.
 *
 * Deploy: `vercel --prod`. The route is reachable at
 * `https://cipher-x402-mcp.vercel.app/api/mcp` (and via rewrite `/mcp`).
 *
 * Vercel Functions default to the Node runtime, which gives us full fetch +
 * the @modelcontextprotocol/sdk streamableHttp transport.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "../src/server.js";

// Reuse a single server + transport across warm invocations.
let bootstrapped: {
  transport: StreamableHTTPServerTransport;
} | null = null;

async function bootstrap(): Promise<{
  transport: StreamableHTTPServerTransport;
}> {
  if (bootstrapped) return bootstrapped;
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });
  await server.connect(transport);
  bootstrapped = { transport };
  return bootstrapped;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const { transport } = await bootstrap();

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const bodyText = Buffer.concat(chunks).toString("utf8");
  const body = bodyText.length > 0 ? JSON.parse(bodyText) : undefined;

  await transport.handleRequest(req, res, body);
}
