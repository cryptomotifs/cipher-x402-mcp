/**
 * Streamable HTTP transport — for remote discovery by Smithery / Glama /
 * PulseMCP and for AI agents that speak MCP-over-HTTP.
 *
 * Endpoint:  POST /mcp  (MCP JSON-RPC messages, streamed replies).
 * Health:    GET  /     (lightweight JSON, version + tool list).
 *
 * Compatible with Node 20+ and Vercel Serverless Functions via the default
 * Node.js runtime (we proxy through `api/mcp.ts` for Vercel).
 */

import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server.js";
import { TOOLS } from "./tools.js";

const PORT = Number(process.env.PORT ?? 8080);

const mcpServer = buildServer();

// One transport, reused across requests. StreamableHTTPServerTransport
// tracks its own session state per connection.
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

await mcpServer.connect(transport);

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (url.pathname === "/" || url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify(
          {
            name: "cipher-x402-mcp",
            version: "0.1.0",
            transports: ["stdio", "streamable-http"],
            mcp_endpoint: "/mcp",
            tools: TOOLS.map((t) => ({
              name: t.name,
              price_usdc: t.priceUsdc,
            })),
            repo: "https://github.com/cryptomotifs/cipher-x402-mcp",
            docs: "https://github.com/cryptomotifs/cipher-x402-mcp#readme",
          },
          null,
          2,
        ),
      );
      return;
    }

    if (url.pathname === "/mcp") {
      // Read body for POST.
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk as Buffer);
      }
      const bodyText = Buffer.concat(chunks).toString("utf8");
      const body = bodyText.length > 0 ? JSON.parse(bodyText) : undefined;
      await transport.handleRequest(req, res, body);
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found", path: url.pathname }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    } catch {
      // response may already be committed
    }
  }
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`cipher-x402-mcp http listening on :${PORT}`);
});
