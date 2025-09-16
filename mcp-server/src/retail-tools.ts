import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import SuperJSON from "superjson";
import type { AppRouter } from "../../site/src/server/trpc/root.js";

const serverUrl = "http://localhost:3000";

// Create a tRPC client
const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: SuperJSON,
      url: `${serverUrl}/trpc`,
    }),
  ],
});

// These would be HTTP calls to your tRPC endpoints
// You could also import the tRPC router directly
// if you share the database..

// Default session ID for MCP testing
const DEFAULT_SESSION_ID = 'mcp-test-session';

export function addRetailTools(server: McpServer) {
  server.tool(
    "checkout",
    "Use this tool to checkout",
    {
      sessionId: z.string().optional().describe("Session ID for guest users"),
    },
    async ({ sessionId }) => {
      try {
        const result = await trpc.createCheckoutSession.mutate({
          sessionId: sessionId || DEFAULT_SESSION_ID,
          successUrl: "http://localhost:3000/checkout/success",
          cancelUrl: "http://localhost:3000/checkout/cancel"
        });

        return {
          content: [{ type: "text", text: "Proceed to checkout" }, {
            type: "resource_link",
            uri: result.url,
            description: "Secure checkout link",
          }]
        }
        // return {
        //   elicitations: [{result.url]
        // }
        // return {
        //   content: [
        //     {
        //       type: "text",
        //       text: JSON.stringify({
        //         success: true,
        //         sessionId: result.sessionId,
        //         checkoutUrl: result.url,
        //         message: "Checkout session created successfully!"
        //       }, null, 2),
        //     },
        //   ],
        // };
      } catch (error) {
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
    async ({ query, categoryId, minPrice, maxPrice, limit }) => {
      try {
        // Use tRPC client directly
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
    async ({ slug }) => {
      try {
        // Use tRPC client directly
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
    async () => {
      try {
        // Use tRPC client directly
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
    async ({ productId, quantity, sessionId }) => {
      try {
        // Use tRPC client directly
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
    async ({ sessionId }) => {
      try {
        // Use tRPC client directly
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
    async ({ limit }) => {
      try {
        // Use tRPC client directly
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
    async ({ orderId, sessionId }) => {
      try {
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
