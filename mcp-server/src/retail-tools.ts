import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import SuperJSON from "superjson";
import type { AppRouter } from "../../site/src/server/trpc/root.js";
import { exchangeTokenForAudience, type TokenExchangeResponse } from "./auth0.js";
import { env } from "./env.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";

const serverUrl = env.API_SERVER_URL;
const trpcAudience = env.API_SERVER_AUDIENCE;

// In-memory token cache
interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

// Helper function to get or exchange token
async function getExchangedToken(originalToken: string): Promise<string> {
  console.log(`🔄 TOKEN EXCHANGE: Starting token exchange process`);
  console.log(`📋 Original token (first 10 chars): ${originalToken.substring(0, 10)}...`);
  console.log(`🎯 Target audience: ${trpcAudience}`);
  
  const cacheKey = `trpc_${originalToken.substring(0, 20)}`; // Use part of token as cache key
  const cached = tokenCache.get(cacheKey);
  
  // Check if we have a valid cached token (with 5 minute buffer)
  if (cached && cached.expiresAt > Date.now() + 300000) {
    console.log('✅ TOKEN EXCHANGE: Using cached exchanged token (no exchange needed)');
    return cached.token;
  }

  try {
    console.log('🚀 TOKEN EXCHANGE: Performing OAuth 2.0 token exchange...');
    console.log(`📤 Exchanging for audience: ${trpcAudience}`);
    
    // Exchange token for TRPC audience
    const exchangeResponse: TokenExchangeResponse = await exchangeTokenForAudience(
      originalToken,
      trpcAudience,
      {
        clientId: env.CLIENT_ID,
        clientSecret: env.CLIENT_SECRET,
        issuer: env.ISSUER_BASE_URL,
      }
    );

    console.log('✅ TOKEN EXCHANGE: Exchange successful!');
    console.log(`📥 New token (first 10 chars): ${exchangeResponse.access_token.substring(0, 10)}...`);
    console.log(`⏰ Token expires in: ${exchangeResponse.expires_in} seconds`);

    // Cache the exchanged token
    const expiresAt = exchangeResponse.expires_in 
      ? Date.now() + (exchangeResponse.expires_in * 1000)
      : Date.now() + 3600000; // Default 1 hour if no expires_in

    tokenCache.set(cacheKey, {
      token: exchangeResponse.access_token,
      expiresAt,
    });

    console.log('💾 TOKEN EXCHANGE: Token cached for future use');
    return exchangeResponse.access_token;
  } catch (error) {
    console.error("❌ TOKEN EXCHANGE: Exchange failed:", error);
    console.log('🔄 TOKEN EXCHANGE: Falling back to original token');
    return originalToken;
  }
}

// Create a function to get tRPC client with authentication
function createAuthenticatedTRPCClient(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchStreamLink({
        transformer: SuperJSON,
        url: `${serverUrl}/trpc`,
        headers: async () => {
          const headers: Record<string, string> = {};
          if (token) {
            console.log('🔐 AUTH: Creating authenticated TRPC client with token');
            const exchangedToken = await getExchangedToken(token);
            headers.Authorization = `Bearer ${exchangedToken}`;
            console.log('🔐 AUTH: Authorization header set with exchanged token');
          } else {
            console.log('⚠️  AUTH: Creating unauthenticated TRPC client (no token provided)');
          }
          return headers;
        },
      }),
    ],
  });
}

// Default session ID for MCP testing
const DEFAULT_SESSION_ID = 'mcp-test-session';

export function addRetailTools(server: McpServer) {
  // Helper function to get authentication token from MCP server context
  async function getAuthToken(extra?: any): Promise<string | undefined> {
    console.log('🔍 AUTH: Extracting token from MCP context...');
    
    // Extract token from the MCP server auth context
    // The withMcpAuth wrapper passes the AuthInfo through extra.authInfo
    if (extra?.authInfo?.token) {
      console.log('✅ AUTH: Token found in extra.authInfo.token');
      console.log(`📋 Token (first 10 chars): ${extra.authInfo.token.substring(0, 10)}...`);
      return extra.authInfo.token;
    }
    
    // Check if the auth info is directly in extra.auth (alternative location)
    if (extra?.auth?.token) {
      console.log('✅ AUTH: Token found in extra.auth.token');
      console.log(`📋 Token (first 10 chars): ${extra.auth.token.substring(0, 10)}...`);
      return extra.auth.token;
    }
    
    // Alternative: check if the auth info is directly in extra
    if (extra?.token) {
      console.log('✅ AUTH: Token found in extra.token');
      console.log(`📋 Token (first 10 chars): ${extra.token.substring(0, 10)}...`);
      return extra.token;
    }
    
    // Fallback: try to get from request if available
    if (extra?.request?.headers) {
      const authHeader = extra.request.headers.get?.("authorization") || 
                         extra.request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.log('✅ AUTH: Token found in request headers');
        const token = authHeader.slice(7);
        console.log(`📋 Token (first 10 chars): ${token.substring(0, 10)}...`);
        return token;
      }
    }
    
    // Log for debugging purposes
    console.log('❌ AUTH: No token found in MCP context');
    console.log('🔍 AUTH: Available extra keys:', extra ? Object.keys(extra) : 'No extra context');
    if (extra?.authInfo) {
      console.log('🔍 AUTH: authInfo keys:', Object.keys(extra.authInfo));
    }
    
    return undefined;
  }

  server.tool(
    "checkout",
    "Use this tool to checkout",
    {
      sessionId: z.string().describe("Session ID"),
    },
    async ({ sessionId }, extra) => {
      try {
        // Check if this is a proxy agent (has skyfire_act claim)
        const audiencePrefix = `${trpcAudience}/`;
        const skyfireAct = extra?.authInfo?.extra?.[`${audiencePrefix}skyfire_act`];
        
        if (skyfireAct) {
          console.log(`� CHECKOUT: Proxy agent detected with skyfire_act: ${skyfireAct}`);
          
          // Check if payment authorization is provided
          const paymentAuthorization = extra?.authInfo?.extra?.paymentAuthorization;
          
          if (!paymentAuthorization) {
            console.log(`🚫 CHECKOUT BLOCKED: Proxy agent without payment authorization`);
            
            // Get cart total to determine payment amount
            const authToken = await getAuthToken(extra);
            const trpc = createAuthenticatedTRPCClient(authToken);
            const cart = await trpc.getCart.query({ sessionId });
            const cartTotal = cart.total || 0;
            
            return {
              isError: true,
              content: [
                { type: "text", text: `Payment required for proxy agents. This checkout operation costs $${cartTotal.toFixed(2)}` }
              ],
              structuredContent: {
                amount_required: cartTotal
              }
            };
          }
          
          console.log(`💳 CHECKOUT: Payment authorization provided for proxy agent`);
          
          // For proxy agents with payment authorization, create the Skyfire order directly
          const authToken = await getAuthToken(extra);
          const trpc = createAuthenticatedTRPCClient(authToken);
          
          // Get cart total to determine payment amount
          const cart = await trpc.getCart.query({ sessionId });
          const cartTotal = cart.total || 0;
          
          const skyfireOrder = await trpc.createSkyfireOrder.mutate({
            sessionId: sessionId,
            paymentAmount: cartTotal,
            paymentToken: paymentAuthorization,
            skyfireAct: skyfireAct
          });

          return {
            content: [
              { type: "text", text: `Order created successfully! Order ID: ${skyfireOrder.orderId}. Items: ${skyfireOrder.itemCount || 0}. Payment processed via Skyfire (${skyfireOrder.skyfireAct || 'direct'}). Your items will be processed and shipped soon.` },
              { type: "text", text: `Here is your tracker link: ${trpcAudience}/orders/${skyfireOrder.orderId}` }
            ]
          };
        }

        // For regular users (non-proxy agents), use the standard checkout flow
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const result = await trpc.createCheckoutSession.mutate({
          sessionId: sessionId,
          successUrl: `${env.API_SERVER_URL}/checkout/success`,
          cancelUrl: `${env.API_SERVER_URL}/checkout/cancel`
        });

        return {
          content: [
            { type: "text", text: `Please complete your purchase by visiting the following URL: ${result.url}` },
          ]
        };
      } catch (error) {
        
        if (error instanceof McpError) {
          throw error;
        }

        return {
          content: [
            {
              type: "text",
              text: `Error during checkout: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Product search and discovery
  server.tool(
    "search_products",
    "Search for products in the store catalog",
    {
      query: z.string().describe("Search term for products"),
      categoryId: z.string().optional().describe("Filter by category ID"),
      minPrice: z.number().optional().describe("Minimum price filter"),
      maxPrice: z.number().optional().describe("Maximum price filter"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(12)
        .describe("Number of results to return"),
    },
    async ({ query, categoryId, minPrice, maxPrice, limit }, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const result = await trpc.getProducts.query({
          search: query,
          categoryId,
          minPrice,
          maxPrice,
          limit,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total: result.total || 0,
                products: (result.products || []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  category: p.category?.name || 'Unknown',
                  categoryId: p.categoryId,
                  inventory: p.inventory,
                  featured: p.featured
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
              text: `Error searching products: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get product details
  server.tool(
    "get_product",
    "Get detailed information about a specific product",
    {
      slug: z.string().describe("Product slug identifier"),
    },
    async ({ slug }, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const product = await trpc.getProduct.query({ slug });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                category: product.category?.name || 'Unknown',
                categoryId: product.categoryId,
                description: product.description || 'No description available',
                inventory: product.inventory || 0,
                colors: product.colors || [],
                materials: product.materials || [],
                dimensions: product.dimensions,
                weight: product.weight,
                sku: product.sku,
                featured: product.featured
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting product: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get categories
  server.tool(
    "get_categories",
    "Get all available product categories",
    {},
    async ({}, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const categories = await trpc.getCategories.query();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                categories: (Array.isArray(categories) ? categories : []).map((cat: any) => ({
                  id: cat.id,
                  name: cat.name,
                  slug: cat.slug,
                  description: cat.description,
                  productCount: cat._count?.products || 0
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
              text: `Error getting categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Shopping cart operations
  server.tool(
    "add_to_cart",
    "Add a product to the shopping cart",
    {
      productId: z.string().describe("ID of the product to add"),
      quantity: z.number().min(1).describe("Quantity to add"),
      sessionId: z.string().optional().describe("Session ID for guest users"),
    },
    async ({ productId, quantity, sessionId }, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        await trpc.addToCart.mutate({ 
          productId, 
          quantity, 
          sessionId: sessionId || DEFAULT_SESSION_ID 
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully added ${quantity} item(s) to cart!`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error adding to cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get cart contents
  server.tool(
    "get_cart",
    "Get current shopping cart contents",
    {
      sessionId: z.string().optional().describe("Session ID for guest users"),
    },
    async ({ sessionId }, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const cart = await trpc.getCart.query({ 
          sessionId: sessionId || DEFAULT_SESSION_ID 
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                total: cart.total || 0,
                itemCount: cart.items?.length || 0,
                items: (cart.items || []).map((item: any) => ({
                  id: item.id,
                  productId: item.productId,
                  name: item.product?.name || item.name || 'Unknown item',
                  quantity: item.quantity,
                  price: item.product?.price || item.price || 0,
                  subtotal: ((item.product?.price || item.price || 0) * item.quantity)
                })),
                sessionId: cart.sessionId
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get featured products
  server.tool(
    "get_featured_products",
    "Get featured products for the homepage",
    {
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(8)
        .describe("Number of featured products to return"),
    },
    async ({ limit }, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const products = await trpc.getFeaturedProducts.query({ limit });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                products: (Array.isArray(products) ? products : []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: p.price,
                  category: p.category?.name || 'Unknown',
                  categoryId: p.categoryId,
                  inventory: p.inventory,
                  featured: p.featured
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
              text: `Error getting featured products: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Get order status
  server.tool(
    "get_order",
    "Get order details and status",
    {
      orderId: z.number().describe("Order ID to retrieve"),
      sessionId: z.string().optional().describe("Session ID for guest users"),
    },
    async ({ orderId, sessionId }, extra) => {
      try {
        const authToken = await getAuthToken(extra);
        const trpc = createAuthenticatedTRPCClient(authToken);
        
        const order = await trpc.getOrder.query({ orderId });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: order.id,
                status: order.status,
                total: order.total,
                email: order.email,
                createdAt: order.createdAt,
                stripeSessionId: order.stripeSessionId,
                items: order.items?.map((item: any) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  price: item.price,
                  product: item.product ? {
                    name: item.product.name,
                    slug: item.product.slug
                  } : null
                })) || []
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting order: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
