/**
 * Simple MCP Proxy Client
 * 
 * Acts as a proxy to connect to a single remote MCP service discovered through Skyfire tools.
 * This client accepts a JWT token and forwards requests to the upstream MCP server via HTTP.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

interface MCPServiceConfig {
  url: string;
  name: string;
  description?: string;
}

/**
 * MCP Proxy Client - connects to upstream MCP services
 */
export class MCPProxyClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private cachedTools: any[] = [];
  private connected = false;

  constructor(
    private serviceConfig: MCPServiceConfig,
    private jwtToken: string
  ) {}

  /**
   * Connect to the upstream MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Create MCP client
      this.client = new Client(
        { 
          name: "skyfire-mcp-proxy", 
          version: "1.0.0" 
        },
        {
          capabilities: {
            roots: {},
            sampling: {},
          },
        }
      );

      // Create HTTP transport with JWT authentication
      this.transport = new StreamableHTTPClientTransport(new URL(this.serviceConfig.url), {
        requestInit: {
          headers: {
            'Authorization': `Bearer ${this.jwtToken}`,
            'Content-Type': 'application/json',
          },
        },
      });

      // Connect to upstream server
      await this.client.connect(this.transport);
      this.connected = true;

      console.info(`[MCP Proxy] Connected to ${this.serviceConfig.name} at ${this.serviceConfig.url}`);
    } catch (error) {
      console.error(`[MCP Proxy] Failed to connect to ${this.serviceConfig.name}:`, error);
      throw new Error(`Failed to connect to upstream MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from the upstream MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.client) {
        await this.client.close();
      }
      
      this.client = null;
      this.transport = null;
      this.connected = false;
      this.cachedTools = [];

      console.info(`[MCP Proxy] Disconnected from ${this.serviceConfig.name}`);
    } catch (error) {
      console.error(`[MCP Proxy] Error during disconnect:`, error);
    }
  }

  /**
   * Discover and cache tools from the upstream server
   */
  async discoverTools(): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to upstream server');
    }

    try {
      const toolsResponse = await this.client.listTools();
      this.cachedTools = toolsResponse.tools || [];
      
      console.info(`[MCP Proxy] Discovered ${this.cachedTools.length} tools from ${this.serviceConfig.name}`);
      return this.cachedTools;
    } catch (error) {
      console.error(`[MCP Proxy] Failed to discover tools:`, error);
      throw new Error(`Failed to discover tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cached tools (pre-cached from discovery)
   */
  getCachedTools(): any[] {
    return this.cachedTools;
  }

  /**
   * Call a tool on the upstream server
   */
  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to upstream server');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      console.debug(`[MCP Proxy] Called tool ${toolName} successfully`);
      return result;
    } catch (error) {
      console.error(`[MCP Proxy] Failed to call tool ${toolName}:`, error);
      throw new Error(`Failed to call tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get service configuration
   */
  getServiceConfig(): MCPServiceConfig {
    return this.serviceConfig;
  }
}

/**
 * Create and initialize an MCP proxy client
 */
export async function createMCPProxy(
  serviceConfig: MCPServiceConfig,
  jwtToken: string
): Promise<MCPProxyClient> {
  const client = new MCPProxyClient(serviceConfig, jwtToken);
  await client.connect();
  await client.discoverTools(); // Pre-cache tools
  return client;
}
