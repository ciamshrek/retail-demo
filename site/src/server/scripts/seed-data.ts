import { db } from "~/server/db";

export async function seedData() {
  console.log("🌱 Seeding database with sample data...");

  // Clear existing data
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();

  // Create categories
  const livingRoom = await db.category.create({
    data: {
      name: "Living Room",
      slug: "living-room",
      description: "Comfortable and stylish furniture for your living space",
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop"
    }
  });

  const bedroom = await db.category.create({
    data: {
      name: "Bedroom",
      slug: "bedroom",
      description: "Create your perfect sanctuary with our bedroom collection",
      imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop"
    }
  });

  const dining = await db.category.create({
    data: {
      name: "Dining",
      slug: "dining",
      description: "Elegant dining furniture for memorable meals",
      imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop"
    }
  });

  const office = await db.category.create({
    data: {
      name: "Office",
      slug: "office",
      description: "Productive and comfortable workspace solutions",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"
    }
  });

  const lighting = await db.category.create({
    data: {
      name: "Lighting",
      slug: "lighting",
      description: "Beautiful lighting to illuminate your space",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"
    }
  });

  // Create products
  const products = [
    // Living Room Products
    {
      name: "Modern Sectional Sofa",
      slug: "modern-sectional-sofa",
      description: "A luxurious sectional sofa with premium fabric upholstery and deep cushions for ultimate comfort. Perfect for entertaining or relaxing with family.",
      price: 2499.00,
      compareAtPrice: 2999.00,
      sku: "SOFA-001",
      inventory: 15,
      featured: true,
      materials: ["Fabric", "Hardwood Frame", "High-Density Foam"],
      dimensions: "108\" W x 75\" D x 32\" H",
      weight: "180 lbs",
      colors: ["Charcoal", "Cream", "Navy"],
      categoryId: livingRoom.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop",
          altText: "Modern sectional sofa in charcoal fabric",
          sortOrder: 0
        },
        {
          url: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop",
          altText: "Side view of sectional sofa",
          sortOrder: 1
        }
      ]
    },
    {
      name: "Scandinavian Coffee Table",
      slug: "scandinavian-coffee-table",
      description: "Clean lines and natural oak wood define this beautiful coffee table. Features a lower shelf for storage and showcases exceptional craftsmanship.",
      price: 599.00,
      sku: "TABLE-001",
      inventory: 25,
      featured: true,
      materials: ["Oak Wood", "Metal Hardware"],
      dimensions: "48\" W x 24\" D x 16\" H",
      weight: "45 lbs",
      colors: ["Natural Oak", "White Oak"],
      categoryId: livingRoom.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop",
          altText: "Scandinavian coffee table in natural oak",
          sortOrder: 0
        }
      ]
    },
    {
      name: "Velvet Accent Chair",
      slug: "velvet-accent-chair",
      description: "Add a pop of luxury with this stunning velvet accent chair. Features a swivel base and plush cushioning for both style and comfort.",
      price: 899.00,
      compareAtPrice: 1099.00,
      sku: "CHAIR-001",
      inventory: 12,
      featured: true,
      materials: ["Velvet", "Steel Base", "High-Density Foam"],
      dimensions: "28\" W x 30\" D x 31\" H",
      weight: "35 lbs",
      colors: ["Emerald", "Blush Pink", "Navy", "Charcoal"],
      categoryId: livingRoom.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
          altText: "Emerald velvet accent chair",
          sortOrder: 0
        }
      ]
    },

    // Bedroom Products
    {
      name: "Platform Bed Frame",
      slug: "platform-bed-frame",
      description: "Minimalist platform bed with upholstered headboard. Clean design that works with any decor style while providing excellent support.",
      price: 1299.00,
      sku: "BED-001",
      inventory: 8,
      featured: true,
      materials: ["Solid Wood", "Linen Upholstery", "Metal Hardware"],
      dimensions: "Queen: 64\" W x 84\" D x 46\" H",
      weight: "120 lbs",
      colors: ["Natural", "Charcoal", "Cream"],
      categoryId: bedroom.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop",
          altText: "Platform bed frame with linen headboard",
          sortOrder: 0
        }
      ]
    },
    {
      name: "Walnut Nightstand",
      slug: "walnut-nightstand",
      description: "Elegant walnut nightstand with soft-close drawers and brass hardware. Perfect complement to any bedroom furniture.",
      price: 449.00,
      sku: "NIGHT-001",
      inventory: 20,
      materials: ["Walnut Wood", "Brass Hardware", "Soft-Close Mechanisms"],
      dimensions: "24\" W x 16\" D x 26\" H",
      weight: "28 lbs",
      colors: ["Walnut", "White Oak"],
      categoryId: bedroom.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1493663284031-b7e3aaa4cab7?w=800&h=600&fit=crop",
          altText: "Walnut nightstand with brass handles",
          sortOrder: 0
        }
      ]
    },

    // Dining Products
    {
      name: "Live Edge Dining Table",
      slug: "live-edge-dining-table",
      description: "Stunning live edge dining table crafted from a single slab of reclaimed wood. Each piece is unique with natural variations in grain and edge.",
      price: 1899.00,
      compareAtPrice: 2299.00,
      sku: "DINING-001",
      inventory: 5,
      featured: true,
      materials: ["Reclaimed Wood", "Steel Legs", "Natural Finish"],
      dimensions: "84\" W x 42\" D x 30\" H",
      weight: "150 lbs",
      colors: ["Natural", "Dark Walnut"],
      categoryId: dining.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
          altText: "Live edge dining table with steel legs",
          sortOrder: 0
        }
      ]
    },
    {
      name: "Upholstered Dining Chairs",
      slug: "upholstered-dining-chairs",
      description: "Set of 2 elegant dining chairs with comfortable upholstered seats and solid wood legs. Perfect for long dinner conversations.",
      price: 398.00,
      sku: "DCHAIR-001",
      inventory: 30,
      materials: ["Solid Wood", "Linen Upholstery", "High-Density Foam"],
      dimensions: "18\" W x 22\" D x 32\" H (each)",
      weight: "15 lbs each",
      colors: ["Natural Linen", "Charcoal", "Navy"],
      categoryId: dining.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
          altText: "Set of upholstered dining chairs",
          sortOrder: 0
        }
      ]
    },

    // Office Products
    {
      name: "Executive Desk",
      slug: "executive-desk",
      description: "Sophisticated executive desk with built-in cable management and spacious drawers. Perfect for the modern home office.",
      price: 1599.00,
      sku: "DESK-001",
      inventory: 10,
      materials: ["Oak Wood", "Steel Hardware", "Leather Inlay"],
      dimensions: "60\" W x 30\" D x 30\" H",
      weight: "95 lbs",
      colors: ["Natural Oak", "Walnut"],
      categoryId: office.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
          altText: "Executive desk in natural oak",
          sortOrder: 0
        }
      ]
    },

    // Lighting Products
    {
      name: "Pendant Light Collection",
      slug: "pendant-light-collection",
      description: "Modern pendant lights with brass accents and hand-blown glass shades. Available individually or as a set of three.",
      price: 299.00,
      sku: "LIGHT-001",
      inventory: 15,
      featured: true,
      materials: ["Brass", "Hand-blown Glass", "LED Compatible"],
      dimensions: "12\" Diameter x 18\" H",
      weight: "8 lbs",
      colors: ["Brass", "Black", "Brushed Nickel"],
      categoryId: lighting.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
          altText: "Modern pendant lights with brass finish",
          sortOrder: 0
        }
      ]
    },
    {
      name: "Floor Lamp - Arc Design",
      slug: "arc-floor-lamp",
      description: "Sculptural arc floor lamp that provides focused lighting while making a design statement. Perfect for reading corners.",
      price: 799.00,
      compareAtPrice: 999.00,
      sku: "LAMP-001",
      inventory: 12,
      materials: ["Brushed Steel", "Marble Base", "Linen Shade"],
      dimensions: "65\" H x 48\" Reach",
      weight: "45 lbs",
      colors: ["Brushed Steel", "Matte Black"],
      categoryId: lighting.id,
      images: [
        {
          url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
          altText: "Arc floor lamp with marble base",
          sortOrder: 0
        }
      ]
    }
  ];

  // Create products with images
  for (const productData of products) {
    const { images, ...productInfo } = productData;
    const product = await db.product.create({
      data: {
        ...productInfo,
        images: {
          create: images
        }
      }
    });
    console.log(`Created product: ${product.name}`);
  }

  console.log("✅ Database seeded successfully!");
}
