/**
 * MCP Server — expose vault operations as MCP tools via stdio
 *
 * Implements Model Context Protocol (JSON-RPC 2.0 over stdio)
 * Zero dependencies — raw readline + JSON parsing
 * Tool definitions generated from registry.mjs (single source of truth)
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Vault } from './vault.mjs';
import { getMcpTools, getMcpDispatch } from './registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')).version;

// Generated from registry — single source of truth for CLI + MCP
const TOOLS = getMcpTools();
const DISPATCH = getMcpDispatch();

// ── Server class ─────────────────────────────────────

export class McpServer {
  constructor(vaultRoot) {
    this.vaultRoot = vaultRoot;
    this._vault = null;
  }

  get vault() {
    if (!this._vault) this._vault = new Vault(this.vaultRoot);
    return this._vault;
  }

  async handleToolCall(name, args) {
    this.vault.invalidateCache();

    const handler = DISPATCH[name];
    if (!handler) throw new Error(`Unknown tool: ${name}`);

    const origLog = console.log;
    const origError = console.error;
    console.log = () => {};
    console.error = () => {};
    try {
      return await handler(this.vaultRoot, args);
    } finally {
      console.log = origLog;
      console.error = origError;
    }
  }

  handleMessage(msg) {
    const { id, method, params } = msg;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'obsidian-agent', version: PKG_VERSION },
          },
        };

      case 'notifications/initialized':
        return null;

      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } };

      case 'tools/call':
        return this.handleToolCall(params.name, params.arguments || {}).then(result => ({
          jsonrpc: '2.0', id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        })).catch(err => ({
          jsonrpc: '2.0', id,
          error: { code: -32000, message: err.message },
        }));

      default:
        return {
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
    }
  }

  start() {
    let buffer = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          const response = this.handleMessage(msg);
          if (response && typeof response.then === 'function') {
            response.then(r => { if (r) process.stdout.write(JSON.stringify(r) + '\n'); });
          } else if (response) {
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        } catch {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0', id: null,
            error: { code: -32700, message: 'Parse error' },
          }) + '\n');
        }
      }
    });
  }
}
