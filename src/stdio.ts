#!/usr/bin/env node
/**
 * stdio transport — for local Claude Desktop, Cursor, Cline.
 * Configured via claude_desktop_config.json "command": "npx cipher-x402-mcp".
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Keep process alive; MCP framework handles lifecycle.
}

main().catch((err) => {
  console.error("cipher-x402-mcp stdio fatal:", err);
  process.exit(1);
});
