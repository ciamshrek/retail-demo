/**
 * Simple MCP Proxy Client
 * 
 * Acts as a proxy to connect to a single remote MCP service discovered through Skyfire tools.
 * This client accepts a JWT token and forwards requests to the upstream MCP server via HTTP.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SkyfireAPIClient, TokenType } from "./skyfire.js";
import { env } from "./env.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";

interface MCPServiceConfig {
  url: string;
  name: string;
  description?: string;
  serviceId?: string; // Skyfire service ID for payment operations
}

/**
 * MCP Proxy Client - connects to upstream MCP services
 */
export class MCPProxyClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private cachedTools: any[] = [];
  private connected = false;
  private skyfireAPI: SkyfireAPIClient;

  constructor(
    private serviceConfig: MCPServiceConfig,
    private jwtToken: string
  ) {
    this.skyfireAPI = new SkyfireAPIClient(env.SKYFIRE_API_KEY);
  }

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
  async callTool(toolName: string, args: any) {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to upstream server');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      if (result.isError) {
        if (result.structuredContent && typeof result.structuredContent === 'object') {
          if ('amount_required' in result.structuredContent) {
            console.log(`[MCP Proxy] Tool ${toolName} requires payment of $${result.structuredContent.amount_required}`);
            throw new McpError(402, '402 payment required', {
              amount_required: result.structuredContent.amount_required
            });
          }
        }
      }

      console.debug(`[MCP Proxy] Called tool ${toolName} successfully`);
      return result;
    } catch (error: any) {
      // Check if this is a 402 Payment Required error
      if (error.code === 402 || (error.message && error.message.includes('402'))) {
        console.log(`[MCP Proxy] Received 402 Payment Required for tool ${toolName}, attempting payment flow`);
        
        // Check if we have a serviceId for payment
        if (!this.serviceConfig.serviceId) {
          console.error(`[MCP Proxy] No serviceId configured for payment - cannot handle 402 error`);
          throw error;
        }

        try {
          const mcpError = error as McpError; 
          const paymentAmount = (mcpError.data as any)?.amount_required;
          console.log(`[MCP Proxy] Creating payment token for $${paymentAmount} to service ${this.serviceConfig.serviceId}`);
          
          const tokenResult = await this.skyfireAPI.createToken({
            buyerTag: `payment-${toolName}-${Date.now()}`,
            sellerServiceId: this.serviceConfig.serviceId,
            amount: paymentAmount,
            tokenType: TokenType.PAY,
          });

          console.log(`[MCP Proxy] Payment token created, retrying tool call with payment authorization`);
          
          // Retry the tool call with payment authorization
          return await this.callToolWithPayment(toolName, args, tokenResult.token);
        } catch (paymentError) {
          console.error(`[MCP Proxy] Payment flow failed for tool ${toolName}:`, paymentError);
          throw new Error(`Payment required but payment flow failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown payment error'}`);
        }
      }

      console.error(`[MCP Proxy] Failed to call tool ${toolName}:`, error);
      throw new Error(`Failed to call tool ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call a tool with payment authorization header
   */
  private async callToolWithPayment(toolName: string, args: any, paymentToken: string) {
    if (!this.connected) {
      throw new Error('Not connected to upstream server');
    }

    try {
      // Create a new client with payment authorization header
      const paymentClient = new Client(
        { 
          name: "skyfire-mcp-proxy-payment", 
          version: "1.0.0" 
        },
        {
          capabilities: {
            roots: {},
            sampling: {},
          },
        }
      );

      // Create HTTP transport with both JWT auth and payment authorization
      const paymentTransport = new StreamableHTTPClientTransport(new URL(this.serviceConfig.url), {
        requestInit: {
          headers: {
            'Authorization': `Bearer ${this.jwtToken}`,
            'Payment-Authorization': `Bearer+Skyfire ${paymentToken}`,
            'Content-Type': 'application/json',
          },
        },
      });

      // Connect and call the tool
      await paymentClient.connect(paymentTransport);
      
      try {
        const result = await paymentClient.callTool({
          name: toolName,
          arguments: args,
        });

        console.log(`[MCP Proxy] Tool ${toolName} succeeded with payment authorization`);
        return result;
      } finally {
        await paymentClient.close();
      }
    } catch (error) {
      console.error(`[MCP Proxy] Tool call with payment failed:`, error);
      throw error;
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
