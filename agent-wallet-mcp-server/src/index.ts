import { Hono } from "hono";
import {
  createMcpHandler,
  withMcpAuth,
  generateProtectedResourceMetadata,
} from "mcp-handler";
import { z } from "zod";
import { auth0, exchangeSkyfireTokenForMCPServer } from "./auth0.js";
import { env } from "./env.js";
import { SkyfireAPIClient, TokenType } from "./skyfire.js";
import { MCPProxyClient, createMCPProxy } from "./connect-to-service.js";
import { TokenCache } from "./token-cache.js";
import { createRequire } from "module";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Use createRequire to import CommonJS version of @n8n/json-schema-to-zod
const require = createRequire(import.meta.url);
const { JsonSchema, jsonSchemaToZod } = require("@n8n/json-schema-to-zod");

const app = new Hono();

// Utility function for error handling
const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

// Initialize Skyfire clients
const skyfireAPI = new SkyfireAPIClient(env.SKYFIRE_API_KEY);

// Initialize token cache for Auth0 tokens
const tokenCache = new TokenCache();

// Global state to track connected MCP services
const connectedServices = new Map<string, MCPProxyClient>();
let mcpServerInstance: McpServer | null = null;

/**
 * Register a dynamic tool with the server
 */
async function registerDynamicTool(
  toolName: string,
  toolDefinition: any,
  proxyClient: MCPProxyClient
) {
  if (!mcpServerInstance) {
    console.warn(
      `[Discovery] No server instance available to register tool: ${toolName}`
    );
    return;
  }

  try {
    const inputSchemaAsZod = toolDefinition.inputSchema
      ? jsonSchemaToZod(toolDefinition.inputSchema).shape
      : undefined;

    const outputSchemaAsZod = toolDefinition.outputSchema
      ? jsonSchemaToZod(toolDefinition.outputSchema).shape
      : undefined;

    mcpServerInstance.registerTool(
      toolName,
      {
        title: toolName,
        annotations: toolDefinition.annotations,
        description:
          toolDefinition.description ||
          `Tool from ${proxyClient.getServiceConfig().name}`,
        inputSchema: inputSchemaAsZod,
        outputSchema: outputSchemaAsZod,
      },
      async (args: any, extra: any) => {
        try {
          // Call the upstream tool and return the result directly
          const result = await proxyClient.callTool(toolDefinition.name, args);
          return result as any;
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error calling ${toolDefinition.name}: ${getErrorMessage(
                  error
                )}`,
              },
            ],
          };
        }
      }
    );

    console.info(
      `[Discovery] Tool registered: ${toolName} (from ${
        proxyClient.getServiceConfig().name
      })`
    );
    return true;
  } catch (error) {
    console.warn(`Failed to register tool ${toolName}:`, error);
    return false;
  }
}

// Create MCP handler with Skyfire buyer service tools
const handler = createMcpHandler(
  (server) => {
    // Store server instance for dynamic tool registration
    mcpServerInstance = server;

    // Skyfire Buyer Service Tools
    // server.tool(
    //   "skyfire-create-kya-token",
    //   "Create a KYA (Know Your Agent) token for accessing seller services",
    //   {
    //     buyerTag: z
    //       .string()
    //       .describe("Buyer internal transaction ID for tracking"),
    //     sellerServiceId: z
    //       .string()
    //       .describe("Target seller service ID to create token for"),
    //   },
    //   async ({ buyerTag, sellerServiceId }) => {
    //     try {
    //       const result = await skyfireAPI.createToken({
    //         buyerTag,
    //         sellerServiceId,
    //         tokenType: TokenType.KYA,
    //       });

    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(result, null, 2),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       const errorMessage =
    //         error instanceof Error ? error.message : String(error);
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error creating KYA token: ${errorMessage}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    // server.tool(
    //   "skyfire-create-pay-token",
    //   "Create a payment token for purchasing services",
    //   {
    //     buyerTag: z
    //       .string()
    //       .describe("Buyer internal transaction ID for tracking"),
    //     sellerServiceId: z.string().describe("Target seller service ID to pay"),
    //     amount: z.number().describe("Amount in USD to pay"),
    //   },
    //   async ({ buyerTag, sellerServiceId, amount }) => {
    //     try {
    //       const result = await skyfireAPI.createToken({
    //         buyerTag,
    //         sellerServiceId,
    //         amount,
    //         tokenType: TokenType.PAY,
    //       });

    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(result, null, 2),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error creating payment token: ${getErrorMessage(error)}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    // server.tool(
    //   "skyfire-create-kya-payment-token",
    //   "Create a combined KYA + Payment token for accessing and paying for services",
    //   {
    //     buyerTag: z
    //       .string()
    //       .describe("Buyer internal transaction ID for tracking"),
    //     sellerServiceId: z.string().describe("Target seller service ID"),
    //     amount: z.number().describe("Amount in USD to pay"),
    //   },
    //   async ({ buyerTag, sellerServiceId, amount }) => {
    //     try {
    //       const result = await skyfireAPI.createToken({
    //         buyerTag,
    //         sellerServiceId,
    //         amount,
    //         tokenType: TokenType.KYA_PAY,
    //       });

    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(result, null, 2),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error creating KYA + Payment token: ${getErrorMessage(
    //               error
    //             )}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    server.tool(
      "wallet-get-services",
      "Get all available services from marketplace",
      {},
      async () => {
        try {
          const response = await skyfireAPI.getServices();
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting services: ${getErrorMessage(error)}`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      "wallet-get-service-tags",
      "Get all available service tags to help filter services",
      {},
      async () => {
        try {
          const response = await skyfireAPI.getServiceTags();
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting service tags: ${getErrorMessage(error)}`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      "wallet-get-services-by-tags",
      "Search for services by specific tags",
      {
        tags: z.array(z.string()).describe("Array of tags to search for"),
      },
      async ({ tags }) => {
        try {
          const response = await skyfireAPI.getServicesByTags(tags);
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error searching services by tags: ${getErrorMessage(
                  error
                )}`,
              },
            ],
          };
        }
      }
    );

    server.tool(
      "wallet-get-balance",
      "Get current wallet balance",
      {},
      async () => {
        try {
          const response = await skyfireAPI.getWalletBalance();
          return {
            content: [{ type: "text", text: JSON.stringify(response) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error getting wallet balance: ${getErrorMessage(error)}`,
              },
            ],
          };
        }
      }
    );

    // server.tool(
    //   "skyfire-get-token-charges",
    //   "Get charges/usage for a specific token",
    //   {
    //     tokenId: z.string().describe("Token ID to get charges for"),
    //   },
    //   async ({ tokenId }) => {
    //     try {
    //       const response = await skyfireAPI.getTokenCharges(tokenId);
    //       return {
    //         content: [{ type: "text", text: JSON.stringify(response) }],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error getting token charges: ${getErrorMessage(error)}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    // server.tool(
    //   "skyfire-introspect-token",
    //   "Introspect and validate a token to get its details",
    //   {
    //     token: z.string().describe("Token to introspect"),
    //   },
    //   async ({ token }) => {
    //     try {
    //       const response = await skyfireAPI.introspectToken(token);
    //       return {
    //         content: [{ type: "text", text: JSON.stringify(response) }],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error introspecting token: ${getErrorMessage(error)}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    server.tool(
      "wallet-search-mcp-services",
      "Search for MCP-compatible services in marketplace",
      {
        query: z
          .string()
          .optional()
          .describe("Optional search query to filter services"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Optional tags to filter MCP services"),
      },
      async ({ query, tags }) => {
        try {
          // Get all services from Skyfire
          const servicesResponse = await skyfireAPI.getServices();
          const allServices = servicesResponse.data || servicesResponse;

          // Filter for MCP-compatible services
          // Look for services that have MCP-related tags, descriptions, or URLs
          const mcpServices = allServices.filter((service: any) => {
            const serviceText = JSON.stringify(service).toLowerCase();
            const isMcpCompatible =
              serviceText.includes("mcp") ||
              serviceText.includes("model context protocol") ||
              service.type === "MCP_SERVER_REMOTE" ||
              service.tags?.some(
                (tag: string) =>
                  tag.toLowerCase().includes("mcp") ||
                  tag.toLowerCase().includes("tool") ||
                  tag.toLowerCase().includes("agent")
              );

            // Apply query filter if provided
            if (query && !serviceText.includes(query.toLowerCase())) {
              return false;
            }

            // Apply tag filter if provided
            if (tags && tags.length > 0) {
              const serviceTags =
                service.tags?.map((tag: string) => tag.toLowerCase()) || [];
              const hasMatchingTag = tags.some((tag) =>
                serviceTags.includes(tag.toLowerCase())
              );
              if (!hasMatchingTag) {
                return false;
              }
            }

            return isMcpCompatible;
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    total: mcpServices.length,
                    query: query || "all",
                    tags: tags || [],
                    services: mcpServices.map((service: any) => ({
                      id: service.id,
                      name: service.name,
                      description: service.description,
                      type: service.type,
                      mcpServerUrl: service.mcpServerUrl,
                      tags: service.tags,
                      price: service.price,
                      priceModel: service.priceModel,
                      seller: service.seller,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error searching MCP services: ${getErrorMessage(error)}`,
              },
            ],
          };
        }
      }
    );

    // server.tool(
    //   "mcp_connect",
    //   "Connect to an MCP service and dynamically register its tools",
    //   {
    //     serviceId: z
    //       .string()
    //       .describe(
    //         "Service ID from Skyfire marketplace (if connecting via Skyfire)"
    //       ),
    //     // url: z.string().optional().describe('Direct URL to MCP service (for local/development services)'),
    //     alias: z
    //       .string()
    //       .optional()
    //       .describe(
    //         "Optional alias for the service (defaults to service ID or URL)"
    //       ),
    //   },
    //   async ({ serviceId, alias }, extra) => {
    //     try {
    //       if (!serviceId) {
    //         throw new Error(
    //           "Either serviceId (for Skyfire services) or url (for direct connections) must be provided"
    //         );
    //       }

    //       let mcpServerUrl: string;
    //       let serviceName: string;
    //       let serviceDescription: string;
    //       const serviceAlias = alias || serviceId;

    //       // Check if already connected
    //       if (connectedServices.has(serviceAlias)) {
    //         return {
    //           content: [
    //             {
    //               type: "text",
    //               text: `Already connected to service: ${serviceAlias}`,
    //             },
    //           ],
    //         };
    //       }

    //       // Skyfire marketplace connection
    //       const servicesResponse = await skyfireAPI.getServices();
    //       const allServices = servicesResponse.data || servicesResponse;
    //       const service = allServices.find((s: any) => s.id === serviceId);

    //       if (!service) {
    //         throw new Error(
    //           `Service ${serviceId} not found in Skyfire marketplace`
    //         );
    //       }

    //       if (service.type !== "MCP_SERVER_REMOTE" || !service.mcpServerUrl) {
    //         throw new Error(
    //           `Service ${serviceId} is not an MCP server or missing URL`
    //         );
    //       }

    //       mcpServerUrl = service.mcpServerUrl;
    //       serviceName = service.name;
    //       serviceDescription = service.description;

    //       // if (mcpServerUrl === "https://retail.auth101.dev") {
    //       //   // Handle special case for retail.auth101.dev
    //       //   mcpServerUrl = "http://localhost:3002/mcp";
    //       // }

    //       // Per MCP spec: always use the service URL as the target audience for token exchange
    //       const targetAudience = mcpServerUrl;
    //       const { token } = await skyfireAPI.createToken({
    //         buyerTag: "example_buyer",
    //         sellerServiceId: serviceId,
    //         tokenType: TokenType.KYA,
    //       });

    //       // Always perform token exchange using the MCP service URL as target audience
    //       let authToken: string;
    //       try {
    //         const tokenExchangeResult = await exchangeSkyfireTokenForMCPServer(
    //           token,
    //           targetAudience,
    //           {
    //             clientId: env.RETAIL_CLIENT_ID,
    //             clientSecret: env.RETAIL_CLIENT_SECRET,
    //             issuer: env.RETAIL_AUTH0_DOMAIN,
    //             scope: "openid profile",
    //           }
    //         );

    //         authToken = tokenExchangeResult.access_token;

    //         console.log(
    //           `[MCP Connect] Token exchange successful for MCP service: ${targetAudience}`
    //         );
    //       } catch (tokenExchangeError) {
    //         console.warn(
    //           `[MCP Connect] Token exchange failed: ${getErrorMessage(
    //             tokenExchangeError
    //           )}`
    //         );
    //         throw new Error(
    //           `Token exchange failed for MCP service ${targetAudience}: ${getErrorMessage(
    //             tokenExchangeError
    //           )}`
    //         );
    //       }

    //       // Create proxy client and connect
    //       const proxyClient = await createMCPProxy(
    //         {
    //           url: mcpServerUrl,
    //           name: serviceName,
    //           description: serviceDescription,
    //         },
    //         authToken
    //       );

    //       // Get tools from the connected service
    //       const tools = proxyClient.getCachedTools();

    //       // Register each tool dynamically with the MCP server
    //       const registeredTools: string[] = [];
    //       for (const tool of tools) {
    //         const toolName = `${serviceAlias}_${tool.name}`;

    //         const success = await registerDynamicTool(
    //           toolName,
    //           tool,
    //           proxyClient
    //         );
    //         if (success) {
    //           registeredTools.push(toolName);
    //         }
    //       }

    //       // Store the connected service
    //       connectedServices.set(serviceAlias, proxyClient);

    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(
    //               {
    //                 status: "connected",
    //                 serviceId: serviceId || "direct",
    //                 serviceName,
    //                 alias: serviceAlias,
    //                 mcpServerUrl,
    //                 targetAudience,
    //                 toolsRegistered: registeredTools.length,
    //                 tools: registeredTools,
    //                 message: `Successfully connected to ${serviceName} and registered ${registeredTools.length} tools using token exchange for audience: ${targetAudience}`,
    //               },
    //               null,
    //               2
    //             ),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error connecting to MCP service: ${getErrorMessage(
    //               error
    //             )}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    // server.tool(
    //   "mcp_disconnect",
    //   "Disconnect from an MCP service",
    //   {
    //     alias: z.string().describe("Service alias to disconnect from"),
    //   },
    //   async ({ alias }) => {
    //     try {
    //       const proxyClient = connectedServices.get(alias);
    //       if (!proxyClient) {
    //         return {
    //           content: [
    //             {
    //               type: "text",
    //               text: `No connection found for alias: ${alias}`,
    //             },
    //           ],
    //         };
    //       }

    //       await proxyClient.disconnect();
    //       connectedServices.delete(alias);

    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(
    //               {
    //                 status: "disconnected",
    //                 alias,
    //                 message: `Successfully disconnected from ${alias}`,
    //               },
    //               null,
    //               2
    //             ),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error disconnecting from MCP service: ${getErrorMessage(
    //               error
    //             )}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    // server.tool(
    //   "mcp_list_connections",
    //   "List all active MCP service connections",
    //   {},
    //   async () => {
    //     try {
    //       const connections = Array.from(connectedServices.entries()).map(
    //         ([alias, client]) => ({
    //           alias,
    //           config: client.getServiceConfig(),
    //           connected: client.isConnected(),
    //           tools: client.getCachedTools().length,
    //         })
    //       );

    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: JSON.stringify(
    //               {
    //                 totalConnections: connections.length,
    //                 connections,
    //               },
    //               null,
    //               2
    //             ),
    //           },
    //         ],
    //       };
    //     } catch (error) {
    //       return {
    //         content: [
    //           {
    //             type: "text",
    //             text: `Error listing connections: ${getErrorMessage(error)}`,
    //           },
    //         ],
    //       };
    //     }
    //   }
    // );

    // Dynamic MCP tools - connect-call-discard pattern
    server.tool(
      "discover-provider",
      "Discover tools available from a service provider",
      {
        serviceId: z.string().describe("Service ID from marketplace"),
      },
      {
        title: 'Discover Provider'
      },
      async ({ serviceId }) => {
        let tempClient: MCPProxyClient | null = null;
        try {
          console.log(`[Provider Discovery] Listing tools for service: ${serviceId}`);
          
          // Check cache first
          let cachedToken = await tokenCache.getToken(serviceId);
          let cachedConfig = await tokenCache.getServiceConfig(serviceId);
          
          let mcpServerUrl: string;
          let serviceName: string;
          
          if (cachedConfig && cachedToken) {
            console.log(`[Provider Discovery] Using cached config and token for ${serviceId}`);
            mcpServerUrl = cachedConfig.url;
            serviceName = cachedConfig.name;
          } else {
            console.log(`[Provider Discovery] Fetching fresh config for ${serviceId}`);
            
            // Get service info from marketplace
            const servicesResponse = await skyfireAPI.getServices();
            const allServices = servicesResponse.data || servicesResponse;
            const service = allServices.find((s: any) => s.id === serviceId);
            if (!service) {
              throw new Error(`Service ${serviceId} not found in marketplace`);
            }
            
            if (service.type !== "MCP_SERVER_REMOTE" || !service.mcpServerUrl) {
              throw new Error(`Service ${serviceId} is not an MCP server or missing URL`);
            }
            
            mcpServerUrl = service.mcpServerUrl;
            serviceName = service.name;
            const targetAudience = mcpServerUrl;
            
            // Get fresh token and exchange it
            const tokenResult = await skyfireAPI.createToken({
              buyerTag: `dynamic-list-${Date.now()}`,
              sellerServiceId: serviceId,
              tokenType: TokenType.KYA,
            });
            
            const mcpResult = await exchangeSkyfireTokenForMCPServer(
              tokenResult.token,
              targetAudience,
              {
                clientId: env.RETAIL_CLIENT_ID,
                clientSecret: env.RETAIL_CLIENT_SECRET,
                issuer: env.RETAIL_AUTH0_DOMAIN,
                scope: "openid profile",
              }
            );
            
            // Cache the token and config
            await tokenCache.cacheToken(serviceId, mcpResult.access_token, 3600);
            await tokenCache.cacheServiceConfig(serviceId, {
              url: mcpServerUrl,
              name: serviceName,
              description: service.description
            });
            
            cachedToken = mcpResult.access_token;
          }
          
          // Create temporary connection
          tempClient = await createMCPProxy(
            {
              url: mcpServerUrl,
              name: serviceName,
              serviceId: serviceId,
            },
            cachedToken!
          );
          
          const tools = tempClient.getCachedTools();
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  serviceId,
                  serviceName,
                  totalTools: tools.length,
                  tools: tools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                  }))
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error listing tools for ${serviceId}: ${getErrorMessage(error)}`,
              },
            ],
          };
        } finally {
          // Always disconnect temporary client
          if (tempClient) {
            try {
              await tempClient.disconnect();
            } catch (error) {
              console.warn(`[DynamicMCP] Error disconnecting temp client:`, error);
            }
          }
        }
      }
    );

    server.tool(
      "interact-with-provider",
      "Call a tool from a service provider",
      {
        serviceId: z.string().describe("Service ID from marketplace"),
        toolName: z.string().describe("Name of the tool to call"),
        arguments: z.record(z.any()).describe("Arguments to pass to the tool"),
      },
      {
        title: 'Interact with Provider'
      },
      async ({ serviceId, toolName, arguments: args }, extra) => {
        let tempClient: MCPProxyClient | null = null;
        try {
          console.log(`[Provider Interaction] Calling tool ${toolName} on service: ${serviceId}`);
          
          // Check cache first
          let cachedToken = await tokenCache.getToken(serviceId);
          let cachedConfig = await tokenCache.getServiceConfig(serviceId);
          
          let mcpServerUrl: string;
          let serviceName: string;
          
          if (cachedConfig && cachedToken) {
            console.log(`[Provider Interaction] Using cached config and token for ${serviceId}`);
            mcpServerUrl = cachedConfig.url;
            serviceName = cachedConfig.name;
          } else {
            console.log(`[Provider Interaction] Fetching fresh config for ${serviceId}`);
            
            // Get service info from marketplace
            const servicesResponse = await skyfireAPI.getServices();
            const allServices = servicesResponse.data || servicesResponse;
            const service = allServices.find((s: any) => s.id === serviceId);
            if (!service) {
              throw new Error(`Service ${serviceId} not found in marketplace`);
            }
            
            if (service.type !== "MCP_SERVER_REMOTE" || !service.mcpServerUrl) {
              throw new Error(`Service ${serviceId} is not an MCP server or missing URL`);
            }
            
            mcpServerUrl = service.mcpServerUrl;
            serviceName = service.name;
            const targetAudience = mcpServerUrl;
            
            // Get fresh token and exchange it
            const tokenResult = await skyfireAPI.createToken({
              buyerTag: `dynamic-call-${Date.now()}`,
              sellerServiceId: serviceId,
              tokenType: TokenType.KYA,
            });
            
            const mcpResult = await exchangeSkyfireTokenForMCPServer(
              tokenResult.token,
              targetAudience,
              {
                clientId: env.RETAIL_CLIENT_ID,
                clientSecret: env.RETAIL_CLIENT_SECRET,
                issuer: env.RETAIL_AUTH0_DOMAIN,
                scope: "openid profile",
              }
            );
            
            // Cache the token and config
            await tokenCache.cacheToken(serviceId, mcpResult.access_token, 3600);
            await tokenCache.cacheServiceConfig(serviceId, {
              url: mcpServerUrl,
              name: serviceName,
              description: service.description
            });
            
            cachedToken = mcpResult.access_token;
          }
          
          // Create temporary connection
          tempClient = await createMCPProxy(
            {
              url: mcpServerUrl,
              name: serviceName,
              serviceId: serviceId,
            },
            cachedToken!
          );
          
          // Call the tool
          const result = await tempClient.callTool(toolName, args);
          
          // Ensure we return the expected format
          return result as any;
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error calling tool ${toolName} on ${serviceId}: ${getErrorMessage(error)}`,
              },
            ],
          } as any;
        } finally {
          // Always disconnect temporary client
          if (tempClient) {
            try {
              await tempClient.disconnect();
            } catch (error) {
              console.warn(`[DynamicMCP] Error disconnecting temp client:`, error);
            }
          }
        }
      }
    );
  },
  {},
  {
    maxDuration: 60,
    verboseLogs: true,
  }
);

const secureHandler = withMcpAuth(handler, auth0, {
  // For this demo lets enforce authorization for all routes
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

app.get("/.well-known/oauth-protected-resource", (c) => {
  return c.json(
    generateProtectedResourceMetadata({
      authServerUrls: [env.ISSUER_BASE_URL],
      resourceUrl: env.RESOURCE_URL,
      additionalMetadata: {
        scopes_supported: [
          "openid",
          "profile",
          "wallet:create-token",
          "wallet:get-services",
          "wallet:balance",
          "wallet:token-management",
        ],
      },
    })
  );
});

// Mount MCP handler on /mcp route (it handles transport internally)
app.all("/mcp/*", async (c) => {
  return await secureHandler(c.req.raw);
});

// Keep the original welcome route with updated information
app.get("/", (c) => {
  return c.json({
    message:
      "Agent Wallet MCP Server - Service Provider Integration with Auth0",
    endpoints: {
      mcp: "/mcp",
      description:
        "MCP server with wallet service tools for marketplace interactions",
    },
    tools: [
      "wallet-get-services",
      "wallet-get-service-tags", 
      "wallet-get-services-by-tags",
      "wallet-get-balance",
      "wallet-search-mcp-services",
      "discover-provider",
      "interact-with-provider",
    ],
    wallet: {
      description: "Agent wallet for marketplace service interactions",
      capabilities: ["service discovery", "secure payments", "token management"],
    },
  });
});

export default app;
