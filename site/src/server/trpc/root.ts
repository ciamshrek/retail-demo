import {
  createCallerFactory,
  createTRPCRouter,
  baseProcedure,
} from "~/server/trpc/main";
import { z } from "zod";
import { db } from "~/server/db";
import { authProcedures } from "./procedures/auth";
import { cartProcedures } from "./procedures/cart";
import { stripeProcedures } from "./procedures/stripe";
import { orderProcedures } from "./procedures/orders";
import { skyfireProcedures } from "./procedures/skyfire";

export const appRouter = createTRPCRouter({
  // Get all categories
  getCategories: baseProcedure.query(async () => {
    return await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { published: true } } }
        }
      }
    });
  }),

  // Get featured products for homepage
  getFeaturedProducts: baseProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(8)
    }))
    .query(async ({ input }) => {
      return await db.product.findMany({
        where: {
          featured: true,
          published: true,
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1
          },
          category: true
        },
        take: input.limit,
        orderBy: { createdAt: "desc" }
      });
    }),

  // Get products with filtering and pagination
  getProducts: baseProcedure
    .input(z.object({
      categoryId: z.string().optional(),
      search: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      colors: z.array(z.string()).optional(),
      materials: z.array(z.string()).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(12),
      sortBy: z.enum(["newest", "price-asc", "price-desc", "name"]).default("newest")
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      
      const where: any = {
        published: true,
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } }
          ]
        }),
        ...(input.minPrice && { price: { gte: input.minPrice } }),
        ...(input.maxPrice && { price: { lte: input.maxPrice } }),
        ...(input.colors && input.colors.length > 0 && {
          colors: { hasSome: input.colors }
        }),
        ...(input.materials && input.materials.length > 0 && {
          materials: { hasSome: input.materials }
        })
      };

      const orderBy: any = {
        newest: { createdAt: "desc" },
        "price-asc": { price: "asc" },
        "price-desc": { price: "desc" },
        name: { name: "asc" }
      }[input.sortBy];

      const [products, total] = await Promise.all([
        db.product.findMany({
          where,
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1
            },
            category: true
          },
          skip: offset,
          take: input.limit,
          orderBy
        }),
        db.product.count({ where })
      ]);

      return {
        products,
        total,
        pages: Math.ceil(total / input.limit),
        currentPage: input.page
      };
    }),

  // Get single product by slug
  getProduct: baseProcedure
    .input(z.object({
      slug: z.string()
    }))
    .query(async ({ input }) => {
      const product = await db.product.findUnique({
        where: { slug: input.slug },
        include: {
          images: {
            orderBy: { sortOrder: "asc" }
          },
          category: true
        }
      });

      if (!product) {
        throw new Error("Product not found");
      }

      return product;
    }),

  // Get related products
  getRelatedProducts: baseProcedure
    .input(z.object({
      productId: z.string(),
      limit: z.number().min(1).max(20).default(4)
    }))
    .query(async ({ input }) => {
      const product = await db.product.findUnique({
        where: { id: input.productId },
        select: { categoryId: true }
      });

      if (!product) return [];

      return await db.product.findMany({
        where: {
          categoryId: product.categoryId,
          published: true,
          NOT: { id: input.productId }
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1
          },
          category: true
        },
        take: input.limit,
        orderBy: { createdAt: "desc" }
      });
    }),

  // Search suggestions
  getSearchSuggestions: baseProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(10).default(5)
    }))
    .query(async ({ input }) => {
      const products = await db.product.findMany({
        where: {
          published: true,
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            select: { url: true, altText: true }
          }
        },
        take: input.limit,
        orderBy: { name: "asc" }
      });

      return products;
    }),

  // Auth procedures
  ...authProcedures,

  // Cart procedures
  ...cartProcedures,

  // Order procedures
  ...orderProcedures,

  // Stripe procedures
  ...stripeProcedures,

  // Skyfire procedures
  ...skyfireProcedures,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
