import { db, productsTable } from "@workspace/db";
import { eq, gt, desc } from "drizzle-orm";
import { logger } from "./logger";
import type { ProductVariantData } from "@workspace/db";

const PRINTFUL_API_BASE = "https://api.printful.com";
const CACHE_TTL_MINUTES = 60;

function getApiKey(): string | undefined {
  return process.env.PRINTFUL_API_KEY;
}

async function printfulFetch(path: string): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("PRINTFUL_API_KEY is not configured");
  }

  const response = await fetch(`${PRINTFUL_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (data as { result: unknown }).result;
}

function mapCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  // CQ2 FIX: Added explicit parentheses to make operator precedence unambiguous.
  // Previously `||` and `&&` precedence caused "sweatshirt" (without "hood") to fall
  // through to the wrong category.
  if (lower.includes("hoodie") || (lower.includes("sweatshirt") && lower.includes("hood"))) return "hoodies";
  if (lower.includes("sweat") || lower.includes("crewneck")) return "sweats";
  if (lower.includes("t-shirt") || lower.includes("tee") || lower.includes("t shirt")) return "tshirts";
  if (lower.includes("shirt") || lower.includes("button")) return "shirts";
  if (lower.includes("pant") || lower.includes("jogger") || lower.includes("trouser")) return "pants";
  if (lower.includes("bag") || lower.includes("tote") || lower.includes("backpack")) return "bags";
  return "accessories";
}

function isCacheValid(cachedAt: Date | null): boolean {
  if (!cachedAt) return false;
  const now = new Date();
  const diff = (now.getTime() - cachedAt.getTime()) / 1000 / 60;
  return diff < CACHE_TTL_MINUTES;
}

export async function getAllProducts() {
  const cached = await db.select().from(productsTable);

  if (cached.length > 0 && cached.every((p) => isCacheValid(p.cachedAt))) {
    return cached;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    if (cached.length > 0) {
      logger.warn("No Printful API key, returning cached products");
      return cached;
    }
    return getSampleProducts();
  }

  try {
    const syncProducts = await printfulFetch("/store/products") as Array<{
      id: number;
      name: string;
      thumbnail_url: string;
    }>;

    type PrintfulProductDetail = {
      sync_product: { id: number; name: string; thumbnail_url: string };
      sync_variants: Array<{
        id: number;
        name: string;
        retail_price: string;
        is_ignored: boolean;
        files: Array<{ type: string; preview_url: string }>;
        product: { image: string };
        warehouse_product_variant?: {
          options?: Array<{ id: string; value: string }>;
        };
      }>;
    };

    // PERF1 FIX: Fetch all product details in parallel instead of sequentially.
    // Previously this loop made N+1 sequential HTTP calls (1 list + N detail fetches),
    // taking ~1 second per product. Promise.allSettled fetches them all concurrently.
    const detailResults = await Promise.allSettled(
      syncProducts.map((sp) =>
        printfulFetch(`/store/products/${sp.id}`) as Promise<PrintfulProductDetail>
      )
    );

    const products = [];

    for (let i = 0; i < detailResults.length; i++) {
      const result = detailResults[i];
      const sp = syncProducts[i];

      if (result.status === "rejected") {
        logger.error({ err: result.reason, productId: sp.id }, "Failed to sync product");
        continue;
      }

      try {
        const detail = result.value;
        const syncProduct = detail.sync_product;
        const syncVariants = detail.sync_variants;
        const category = mapCategoryFromName(syncProduct.name);

        const images: string[] = [];
        const variants: ProductVariantData[] = [];

        for (const sv of syncVariants) {
          if (sv.is_ignored) continue;

          const previewFile = sv.files?.find((f) => f.type === "preview");
          if (previewFile?.preview_url && !images.includes(previewFile.preview_url)) {
            images.push(previewFile.preview_url);
          }

          const options = sv.warehouse_product_variant?.options || [];
          const sizeOpt = options.find((o) => o.id === "size");
          const colorOpt = options.find((o) => o.id === "color");

          variants.push({
            id: sv.id,
            name: sv.name,
            size: sizeOpt?.value ?? null,
            color: colorOpt?.value ?? null,
            colorCode: null,
            price: sv.retail_price,
            inStock: true,
          });
        }

        const imageUrl = images[0] || syncProduct.thumbnail_url || "";

        const productData = {
          printfulId: syncProduct.id,
          name: syncProduct.name,
          category,
          basePrice: variants[0]?.price || "0",
          imageUrl,
          thumbnailUrl: syncProduct.thumbnail_url,
          additionalImages: images.slice(1),
          variants,
          cachedAt: new Date(),
        };

        const existing = await db
          .select()
          .from(productsTable)
          .where(eq(productsTable.printfulId, syncProduct.id));

        if (existing.length > 0) {
          const [updated] = await db
            .update(productsTable)
            .set(productData)
            .where(eq(productsTable.printfulId, syncProduct.id))
            .returning();
          products.push(updated);
        } else {
          const [inserted] = await db
            .insert(productsTable)
            .values(productData)
            .returning();
          products.push(inserted);
        }
      } catch (err) {
        logger.error({ err, productId: sp.id }, "Failed to process product detail");
      }
    }

    return products;
  } catch (err) {
    logger.error({ err }, "Failed to fetch from Printful, returning cached/sample");
    if (cached.length > 0) return cached;
    return getSampleProducts();
  }
}

export async function getProductById(id: number) {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));

  if (!product) return null;

  const related = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.category, product.category));

  const relatedProducts = related.filter((p) => p.id !== id).slice(0, 4);

  return {
    ...product,
    relatedProducts,
  };
}

export async function getProductsByCategory(slug: string) {
  return db.select().from(productsTable).where(eq(productsTable.category, slug)).orderBy(desc(productsTable.id));
}

export async function submitOrderToPrintful(
  lineItems: Array<{ variantId: number; quantity: number }>,
  recipient: {
    name: string;
    email: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  }
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("No Printful API key, skipping order submission");
    return null;
  }

  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient,
        items: lineItems.map((item) => ({
          sync_variant_id: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "Printful order submission failed");
      return null;
    }

    const data = await response.json() as { result: { id: number } };
    return String(data.result.id);
  } catch (err) {
    logger.error({ err }, "Error submitting order to Printful");
    return null;
  }
}

function makeVariants(idBase: number, color: string, colorCode: string, price: string) {
  return [
    { id: idBase + 1, name: `S / ${color}`, size: "S", color, colorCode, price, inStock: true },
    { id: idBase + 2, name: `M / ${color}`, size: "M", color, colorCode, price, inStock: true },
    { id: idBase + 3, name: `L / ${color}`, size: "L", color, colorCode, price, inStock: true },
    { id: idBase + 4, name: `XL / ${color}`, size: "XL", color, colorCode, price, inStock: true },
  ];
}

function getSampleProducts() {
  const PRICE = "25.00";
  const BLACK = "#1a1a1a";
  const GREY = "#9e9e9e";

  return [
    {
      id: 1, printfulId: null,
      name: "Gay Ass Shirts Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/shirts_1774769791237.png",
      thumbnailUrl: "/images/shirts_1774769791237.png",
      additionalImages: [],
      description: "The OG. Small chest logo on a classic black tee. 100% cotton, unisex fit.",
      variants: makeVariants(100, "Black", BLACK, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 2, printfulId: null,
      name: "You Like My G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/stamped_1774769791238.png",
      thumbnailUrl: "/images/stamped_1774769791238.png",
      additionalImages: [],
      description: "Rainbow stamp seal on a black tee. Bold, loud, unapologetic.",
      variants: makeVariants(200, "Black", BLACK, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 3, printfulId: null,
      name: "Neon G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/neon_1774769791238.png",
      thumbnailUrl: "/images/neon_1774769791238.png",
      additionalImages: [],
      description: "Neon glowing text on a sport grey tee. It lights up the room.",
      variants: makeVariants(300, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 4, printfulId: null,
      name: "It's My G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/its_my_gas_1774769791238.png",
      thumbnailUrl: "/images/its_my_gas_1774769791238.png",
      additionalImages: [],
      description: "Cute pastel bubble letters with a pride flag. Sport grey tee.",
      variants: makeVariants(400, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 5, printfulId: null,
      name: "Alpaca G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/too_gay_to_function_1774769791238.png",
      thumbnailUrl: "/images/too_gay_to_function_1774769791238.png",
      additionalImages: [],
      description: "A rainbow alpaca that absolutely does not care. Sport grey tee.",
      variants: makeVariants(500, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 6, printfulId: null,
      name: "Not Gay But My Shirt Is Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/but_my_shirt_is_1774769791239.png",
      thumbnailUrl: "/images/but_my_shirt_is_1774769791239.png",
      additionalImages: [],
      description: "It's the shirt, not you. Sport grey tee with clean bold type.",
      variants: makeVariants(600, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 7, printfulId: null,
      name: "Retro Sunset G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/psychedelic_1774769791239.png",
      thumbnailUrl: "/images/psychedelic_1774769791239.png",
      additionalImages: [],
      description: "Psychedelic retro sunset vibes. Sport grey tee.",
      variants: makeVariants(700, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 8, printfulId: null,
      name: "Bodak Yellow G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/bodak_yellow_1774769791239.png",
      thumbnailUrl: "/images/bodak_yellow_1774769791239.png",
      additionalImages: [],
      description: "Gold and purple bubble text. Money moves only. Sport grey tee.",
      variants: makeVariants(800, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 9, printfulId: null,
      name: "Sassy Sparkle G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/sassy_1774769791239.png",
      thumbnailUrl: "/images/sassy_1774769791239.png",
      additionalImages: [],
      description: "Glittery rainbow cursive with four-point sparkles. Sport grey tee.",
      variants: makeVariants(900, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 10, printfulId: null,
      name: "Rainbow Flag G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/trippy_1774769791240.png",
      thumbnailUrl: "/images/trippy_1774769791240.png",
      additionalImages: [],
      description: "Classic rainbow stripe block letters. Loud and proud. Sport grey tee.",
      variants: makeVariants(1000, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 11, printfulId: null,
      name: "Schoolhouse G.A.S. Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/schoolhouse_rock_1774769791240.png",
      thumbnailUrl: "/images/schoolhouse_rock_1774769791240.png",
      additionalImages: [],
      description: "Retro pastel groovy bubble font. Throwback vibes. Sport grey tee.",
      variants: makeVariants(1100, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 12, printfulId: null,
      name: "G.A.S. Logo Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/gas_logo_1774769791240.png",
      thumbnailUrl: "/images/gas_logo_1774769791240.png",
      additionalImages: [],
      description: "Official G.A.S. flame logo badge. The brand in its purest form. Sport grey tee.",
      variants: makeVariants(1200, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 13, printfulId: null,
      name: "It's My G.A.S. Bubble Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/it_my_gas_1774769791240.png",
      thumbnailUrl: "/images/it_my_gas_1774769791240.png",
      additionalImages: [],
      description: "Stacked colorful bubble letters with sparkle dots. Sport grey tee.",
      variants: makeVariants(1300, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 14, printfulId: null,
      name: "Ol' G.A.S. Fire Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/ol_gas_1774769791240.png",
      thumbnailUrl: "/images/ol_gas_1774769791240.png",
      additionalImages: [],
      description: "Fire and flame emblem in metallic bronze. The classic. Sport grey tee.",
      variants: makeVariants(1400, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 15, printfulId: null,
      name: "$50 Is $50 Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/$50_is_$50_1774769791241.png",
      thumbnailUrl: "/images/$50_is_$50_1774769791241.png",
      additionalImages: [],
      description: "I'm not gay but $50 is $50. A financial decision. Sport grey tee.",
      variants: makeVariants(1500, "Sport Grey", GREY, PRICE),
      cachedAt: new Date(),
    },
    {
      id: 16, printfulId: null,
      name: "G.A.S. Maroon Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Maroon_GAS_1774770322608.jpg",
      thumbnailUrl: "/images/Maroon_GAS_1774770322608.jpg",
      additionalImages: [],
      description: "Unapologetically Extra. Navy graphic on a bold maroon tee. New Orleans EST. 2025.",
      variants: makeVariants(1600, "Maroon", "#800000", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 17, printfulId: null,
      name: "G.A.S. Streetwear Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Green_Gas_1774770322608.jpg",
      thumbnailUrl: "/images/Green_Gas_1774770322608.jpg",
      additionalImages: [],
      description: "Lightning bolt energy. Neon yellow on olive print, on a green tee. G.A.S. Streetwear.",
      variants: makeVariants(1700, "Green", "#3a7d44", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 18, printfulId: null,
      name: "G.A.S. Gold Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Gold_Gas_1774770322609.jpg",
      thumbnailUrl: "/images/Gold_Gas_1774770322609.jpg",
      additionalImages: [],
      description: "Collection One. Teal and gold block graphic. New Orleans, LA · 2025. Yellow tee.",
      variants: makeVariants(1800, "Yellow", "#f5c518", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 19, printfulId: null,
      name: "G.A.S. White Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/White_Gas_1774770322609.jpg",
      thumbnailUrl: "/images/White_Gas_1774770322609.jpg",
      additionalImages: [],
      description: "Clean and minimal. Bold black stacked type on a natural white tee. G.A.S — Collection 00.",
      variants: makeVariants(1900, "Natural White", "#f5f0e8", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 20, printfulId: null,
      name: "G.A.S. Pink Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Pink_GAS_1774770322609.jpg",
      thumbnailUrl: "/images/Pink_GAS_1774770322609.jpg",
      additionalImages: [],
      description: "Barcode, coordinates, the works. Pink on pink graphic. Collection One · New Orleans.",
      variants: makeVariants(2000, "Pink", "#ff69b4", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 21, printfulId: null,
      name: "G.A.S. Pastel Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Purple_Gas_1774770322609.jpg",
      thumbnailUrl: "/images/Purple_Gas_1774770322609.jpg",
      additionalImages: [],
      description: "Soft lavender and mint abstract design on white. New Orleans · EST. 2025. Collection One.",
      variants: makeVariants(2100, "White", "#FFFFFF", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 22, printfulId: null,
      name: "G.A.S. Cream Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Cream_Gas_1774770322610.jpg",
      thumbnailUrl: "/images/Cream_Gas_1774770322610.jpg",
      additionalImages: [],
      description: "Crimson seal stamp on a cream tee. Collection One · New Orleans · 2023.",
      variants: makeVariants(2200, "Cream", "#fffdd0", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 23, printfulId: null,
      name: "G.A.S. Red Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Red_Gas_1774770322610.jpg",
      thumbnailUrl: "/images/Red_Gas_1774770322610.jpg",
      additionalImages: [],
      description: "Tan circle stamp graphic on a fire red tee. G.A.S. Collection One · EST. 2025.",
      variants: makeVariants(2300, "Red", "#cc0000", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 24, printfulId: null,
      name: "G.A.S. Neon Black Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Neon_Gas_1774770322610.jpg",
      thumbnailUrl: "/images/Neon_Gas_1774770322610.jpg",
      additionalImages: [],
      description: "Neon yellow target crosshair G logo on black. Collection One · New Orleans. Full send.",
      variants: makeVariants(2400, "Black", "#1a1a1a", PRICE),
      cachedAt: new Date(),
    },
    {
      id: 25, printfulId: null,
      name: "G.A.S. Navy Tee",
      category: "tshirts", basePrice: PRICE,
      imageUrl: "/images/Navy_Gas_1774770322610.jpg",
      thumbnailUrl: "/images/Navy_Gas_1774770322610.jpg",
      additionalImages: [],
      description: "G.A.S. #1. Bold gold and navy varsity block graphic. Unapologetically Extra. Navy tee.",
      variants: makeVariants(2500, "Navy", "#001f5b", PRICE),
      cachedAt: new Date(),
    },
  ];
}

export async function seedSampleProducts() {
  const existing = await db.select().from(productsTable);
  if (existing.length > 0) {
    logger.info("Products already seeded, skipping");
    return;
  }

  const samples = getSampleProducts();
  for (const product of samples) {
    await db.insert(productsTable).values({
      printfulId: product.printfulId,
      name: product.name,
      category: product.category,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
      thumbnailUrl: product.thumbnailUrl,
      additionalImages: product.additionalImages,
      description: product.description,
      variants: product.variants,
    }).onConflictDoNothing();
  }
  logger.info(`Seeded ${samples.length} products`);
}
